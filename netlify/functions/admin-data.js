// Default suggested questions — overridden by CUSTOM_QUESTIONS env var
const DEFAULT_QUESTIONS = {
  en: {
    employee: [
      "How does the ESOP work?",
      "When do I start getting vested?",
      "What if I leave before I'm vested?",
      "What could my ESOP be worth?",
      "What is Blue Diamond Legacy Holdings?",
      "When can I collect my money?",
    ],
    prospect: [
      "What does employee ownership mean for me?",
      "Do I pay anything to get stock?",
      "How long until it's mine to keep?",
      "What could my ESOP be worth?",
      "What kind of work does KE&G do?",
    ],
  },
  es: {
    employee: [
      "¿Cómo funciona el ESOP?",
      "¿Cuándo empiezo a adquirir derechos?",
      "¿Qué pasa si me voy antes?",
      "¿Cuánto podría valer mi ESOP?",
      "¿Qué es Blue Diamond Legacy Holdings?",
      "¿Cuándo puedo cobrar mi dinero?",
    ],
    prospect: [
      "¿Qué significa ser propietario empleado?",
      "¿Pago algo por las acciones?",
      "¿Cuánto tiempo hasta que sean mías?",
      "¿Cuánto podría valer mi ESOP?",
      "¿Qué tipo de trabajo hace KE&G?",
    ],
  },
};

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  // Password check
  const auth = event.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const adminPass = process.env.ADMIN_PASSWORD || "K3&GM@rketing";

  if (token !== adminPass) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // GET — return current config + sheet log data
  if (event.httpMethod === "GET") {
    try {
      // Load custom questions (stored as JSON in env var)
      let questions = DEFAULT_QUESTIONS;
      try {
        const custom = process.env.CUSTOM_QUESTIONS;
        if (custom) questions = JSON.parse(custom);
      } catch {}

      // Fetch recent log data from Google Sheet via Apps Script
      const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK;
      let logData = { rows: [], summary: { total: 0, byTheme: {}, byMode: {}, byLanguage: {}, byMonth: {} } };

      if (webhookUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(webhookUrl + "?action=getData", {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            const text = await res.text();
            try { logData = JSON.parse(text); } catch {}
          }
        } catch (fetchErr) {
          console.error("Sheet fetch error:", fetchErr.message);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ questions, logData, hasWebhook: !!webhookUrl }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST — save updated questions to env var via Netlify API
  if (event.httpMethod === "POST") {
    try {
      const { questions } = JSON.parse(event.body || "{}");
      if (!questions) return { statusCode: 400, headers, body: JSON.stringify({ error: "No questions provided" }) };

      const siteId = process.env.NETLIFY_SITE_ID;
      const netlifyToken = process.env.NETLIFY_API_TOKEN;

      if (!siteId || !netlifyToken) {
        // Can't save to env — return instructions
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            note: "To enable saving, add NETLIFY_SITE_ID and NETLIFY_API_TOKEN to your environment variables.",
            questions,
          }),
        };
      }

      // Update CUSTOM_QUESTIONS env var via Netlify API
      const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/CUSTOM_QUESTIONS`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${netlifyToken}`,
        },
        body: JSON.stringify({ key: "CUSTOM_QUESTIONS", values: [{ value: JSON.stringify(questions), context: "all" }] }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, note: err }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, questions }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
