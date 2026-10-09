export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { question, mode, language, sessionId, theme } = JSON.parse(event.body)

    // Log to function logs (visible in Netlify → Logs & metrics → Functions → log)
    console.log(JSON.stringify({
      type: 'QUESTION_LOG',
      timestamp: new Date().toISOString(),
      question,
      mode,
      language,
      sessionId,
      theme: theme || 'Other',
    }))

    // If Google Sheets webhook is configured, also send there
    if (process.env.GOOGLE_SHEET_WEBHOOK) {
      fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode, language, sessionId, theme, timestamp: new Date().toISOString() }),
      }).catch(() => {})
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('Log function error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Log failed' }) }
  }
}
