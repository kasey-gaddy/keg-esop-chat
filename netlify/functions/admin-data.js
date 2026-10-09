const THEMES = ['Confidential/Personal','Theoretical Finance','Vesting','Retirement & Payouts','Taxes & Distributions','BDL/Structure','Diversification','Rehire/Return','Recruiting/Job Seeker','General Education','Other']

function classifyTheme(text) {
  const t = (text || '').toLowerCase()
  if (t.match(/personal|my account|my balance|my specific|confidential/)) return 'Confidential/Personal'
  if (t.match(/vest|vesting|years of service/)) return 'Vesting'
  if (t.match(/retire|retirement|age 65|65/)) return 'Retirement & Payouts'
  if (t.match(/tax|taxes|distribution|1099|rollover/)) return 'Taxes & Distributions'
  if (t.match(/blue diamond|bdl|holding/)) return 'BDL/Structure'
  if (t.match(/diversif/)) return 'Diversification'
  if (t.match(/rehire|return|come back|re-hire/)) return 'Rehire/Return'
  if (t.match(/job|hire|apply|salary|pay|recruit|career/)) return 'Recruiting/Job Seeker'
  if (t.match(/worth|value|calculator|how much|estimate|cuánto|valor|calculadora/)) return 'Theoretical Finance'
  if (t.match(/what is esop|how does|explain|overview|basics/)) return 'General Education'
  return 'Other'
}

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
  if (!r.ok) return null
  return r.json()
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  // GET — return analytics + questions + docs
  if (event.httpMethod === 'GET') {
    let questions = null
    let docs = []

    try {
      const savedQ = process.env.SAVED_QUESTIONS
      if (savedQ) questions = JSON.parse(savedQ)
    } catch {}

    try {
      const customDocs = process.env.CUSTOM_DOCS
      if (customDocs) {
        const parsed = JSON.parse(customDocs)
        docs = parsed.map(d => ({ name: d.name, size: (d.content || '').length, uploaded: d.uploaded }))
      }
    } catch {}

    // Analytics: placeholder (real data lives in function logs)
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

  // POST
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}')

    // Login
    if (body.action === 'login') {
      const correct = body.password === process.env.ADMIN_PASSWORD
      return { statusCode: 200, headers, body: JSON.stringify({ success: correct }) }
    }

    // Save questions
    if (body.action === 'saveQuestions') {
      const result = await netlifyApiRequest('PATCH', '/env/SAVED_QUESTIONS', {
        key: 'SAVED_QUESTIONS',
        values: [{ context: 'all', value: JSON.stringify(body.questions) }],
      })
      return { statusCode: 200, headers, body: JSON.stringify({ success: !!result }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}
