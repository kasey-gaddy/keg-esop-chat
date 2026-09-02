import { useState, useRef, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

// ── Brand tokens ───────────────────────────────────────────────────
const B = {
  orange: "#F4792C", navy: "#192437", blue: "#253B80",
  gray: "#BDBEC1", white: "#FFFFFF", black: "#020304",
  bgPage: "#F4F5F7", bgCard: "#FFFFFF", border: "#DDE0E8",
  muted: "#6B7080", mid: "#3A3D4A",
  grad: "linear-gradient(90deg, #192437 0%, #253B80 100%)",
};

const PIE_COLORS = ["#F4792C","#253B80","#192437","#5B8DB8","#A0B4CC","#D4865A","#7C9DBF","#E8A87C","#4A6FA5"];

// ── i18n ───────────────────────────────────────────────────────────
const T = {
  en: {
    title: "ESOP Ownership Assistant",
    employeeMode: "Employee-Owner Mode",
    prospectMode: "Prospective Hire Mode",
    openCalc: "Open Calculator",
    closeCalc: "✕ Close Calc",
    switchMode: "Switch Mode",
    spanish: "Español",
    english: "English",
    whoAreYou: "Who are you?",
    employeeLabel: "I'm a KE&G employee-owner",
    employeeSub: "Ask about vesting, your account, payouts, BDL, and what ownership really means for your retirement.",
    prospectLabel: "I'm exploring a career at KE&G",
    prospectSub: "Learn what employee ownership means in practice — and why it makes KE&G different from most employers.",
    tagline: "Constructing Legacies.",
    footer: "Employee-Owned Since 2014 · Constructing Legacies.",
    placeholder: "Ask about the ESOP…",
    disclaimer: "Estimates only — for account specifics, contact HR directly. · KE&G Construction",
    commonQ: "Common questions",
    calcTitle: "ESOP Wealth Calculator",
    calcSub: "See what your ownership could be worth at retirement",
    payType: "Pay type", hourly: "Hourly", salaried: "Salaried",
    hourlyWage: "Hourly wage", annualSalary: "Annual salary",
    currentBalance: "Current ESOP balance", balanceHint: "From your last annual statement",
    yearsRetire: "Years until retirement", benefitLevel: "Annual benefit level",
    benefitHint: "KE&G's historical average is ~8%. Ask HR for your current rate.",
    estimatedBy: "Estimated value by", perYear: "/year — at no cost out of your paycheck",
    allocations: "Annual allocations", growth: "Share price growth",
    calcDisclaim: "Estimate only. Assumes ~5% annual share price growth. Not financial advice — contact HR for specifics.",
  },
  es: {
    title: "Asistente de Propiedad ESOP",
    employeeMode: "Modo Empleado-Propietario",
    prospectMode: "Modo Candidato",
    openCalc: "Abrir Calculadora",
    closeCalc: "✕ Cerrar Calc",
    switchMode: "Cambiar Modo",
    spanish: "Español",
    english: "English",
    whoAreYou: "¿Quién eres?",
    employeeLabel: "Soy empleado-propietario de KE&G",
    employeeSub: "Pregunta sobre la adquisición de derechos, tu cuenta, pagos, BDL y lo que significa la propiedad para tu jubilación.",
    prospectLabel: "Estoy explorando una carrera en KE&G",
    prospectSub: "Aprende lo que significa la propiedad de empleados en la práctica — y por qué hace que KE&G sea diferente.",
    tagline: "Construyendo Legados.",
    footer: "Propiedad de Empleados desde 2014 · Construyendo Legados.",
    placeholder: "Pregunta sobre el ESOP…",
    disclaimer: "Solo estimaciones — para detalles de tu cuenta, contacta a RRHH. · KE&G Construction",
    commonQ: "Preguntas frecuentes",
    calcTitle: "Calculadora de Riqueza ESOP",
    calcSub: "Descubre cuánto podría valer tu propiedad al jubilarte",
    payType: "Tipo de pago", hourly: "Por hora", salaried: "Asalariado",
    hourlyWage: "Salario por hora", annualSalary: "Salario anual",
    currentBalance: "Saldo ESOP actual", balanceHint: "De tu último estado de cuenta anual",
    yearsRetire: "Años hasta la jubilación", benefitLevel: "Nivel de beneficio anual",
    benefitHint: "El promedio histórico de KE&G es ~8%. Pregunta a RRHH tu tasa actual.",
    estimatedBy: "Valor estimado en", perYear: "/año — sin costo de tu cheque",
    allocations: "Asignaciones anuales", growth: "Crecimiento del precio de acción",
    calcDisclaim: "Solo estimación. Asume ~5% crecimiento anual. No es asesoría financiera — consulta a RRHH.",
  }
};

// ── System prompts ─────────────────────────────────────────────────
const SYSTEM = {
  en: {
    employee: `You are the KE&G Construction ESOP Knowledge Assistant. Answer in plain language like you're talking to someone on a job site — short sentences, no jargon. Use markdown: **bold** for key terms, bullet points with - for lists.

KE&G Construction is 100% employee-owned, founded 1972, Tucson/Sierra Vista AZ. Plan name: Blue Diamond Legacy Holdings, Inc. ESOP. BDL is the holding company that owns KE&G. KE&G Construction, Inc. is a participating employer.

VESTING: Under 2 years: 0%. 2 years: 20%. 3 years: 40%. 4 years: 60%. 5 years: 80%. 6+ years: 100%. Auto 100% vested at age 65 while employed, or death/disability on the job.

WHEN YOU GET PAID:
Retirement (65+), Disability, or Death: First distribution the year AFTER you leave. Example: Leave 2025 → paid 2026.
All other terminations (quit, laid off, fired): Mandatory 5-year wait. Distributions start year 6. Example: Leave 2025 → first check 2032.
Exception: Balance $1,000 or less = automatic lump sum. $1,001–$7,000 = can elect lump sum.
Paid in cash, not stock. Default: annual installments over 5 years.

DIVERSIFICATION: Age 55+ AND 10+ years participation = can diversify up to 25%/yr for 5 years, then 50% in year 6. Use it or lose it after year 6.

TAXES: No taxes while growing. 20% federal withholding at distribution unless rolled to IRA. Before 59.5 may add 10% penalty.

CALCULATOR: When asked about account value or projections, mention the calculator button at the top.

TONE: Short sentences. Plain English. "Vested" = "yours to keep". "Distribution" = "when you collect". Direct personal account questions to HR.`,

    prospect: `You are the KE&G Construction ESOP Chat Assistant for job seekers. Direct, honest, no recruiting fluff. Use markdown: **bold** for key terms, bullet points with - for lists.

KE&G is 100% employee-owned, founded 1972, Tucson/Sierra Vista AZ. 500+ employee-owners. "Constructing Legacies."

ESOP: Company-funded retirement benefit. You pay nothing. KE&G puts stock in your name each year based on your pay. Stock grows as company does. You collect in cash when you leave or retire.

VESTING: Under 2yrs: 0%. 2yrs: 20%. 3: 40%. 4: 60%. 5: 80%. 6+: 100%. Eligible after 1,000 hrs/year.

PAYOUT: Retire at 65+: first payout next year. Leave for any other reason: waiting period applies. All paid in cash.

Only ~1 in 200 US companies is fully employee-owned. When KE&G wins, your retirement grows.
Work: roads, utilities, water systems, drainage, bridges, heavy civil, mine site work, JOC contracts.
Service area: Pima, Santa Cruz, Cochise, Graham, Greenlee counties AZ; Otero County NM.
Values: Safety, Integrity, Development, Excellence. Apply: kegtus.com

CALCULATOR: If asked what ESOP could be worth, mention the calculator button at top.
Do NOT mention Blue Diamond Legacy Holdings. TONE: Short sentences, plain English, no buzzwords.`
  },
  es: {
    employee: `Eres el Asistente de Conocimiento ESOP de KE&G Construction. Responde en español sencillo como si hablaras con alguien en una obra — oraciones cortas, sin tecnicismos. Usa markdown: **negrita** para términos clave, viñetas con - para listas.

KE&G Construction es 100% propiedad de empleados, fundada en 1972, Tucson/Sierra Vista AZ. El plan se llama: Blue Diamond Legacy Holdings, Inc. ESOP. BDL es la empresa holding que es dueña de KE&G.

ADQUISICIÓN DE DERECHOS: Menos de 2 años: 0%. 2 años: 20%. 3 años: 40%. 4 años: 60%. 5 años: 80%. 6+ años: 100%. Adquisición automática al 100% a los 65 años mientras trabajas, o por muerte/discapacidad en el trabajo.

CUÁNDO RECIBES TU DINERO:
Jubilación (65+), Discapacidad o Muerte: Primera distribución el año DESPUÉS de irte. Ejemplo: Te vas en 2025 → cobras en 2026.
Cualquier otra salida (renuncia, despido): Espera obligatoria de 5 años. Distribuciones empiezan en el año 6. Ejemplo: Te vas en 2025 → primer cheque en 2032.
Excepción: Saldo de $1,000 o menos = suma global automática. $1,001–$7,000 = puedes elegir suma global.
Se paga en efectivo, no en acciones. Por defecto: pagos anuales durante 5 años.

DIVERSIFICACIÓN: 55+ años Y 10+ años de participación = puedes diversificar hasta 25%/año por 5 años, luego 50% en el año 6.

CALCULADORA: Si preguntan sobre el valor de la cuenta o proyecciones, menciona el botón de calculadora arriba.

TONO: Oraciones cortas. Español sencillo. "Adquirido" = "tuyo para quedarte". Dirige preguntas personales de cuenta a RRHH.`,

    prospect: `Eres el Asistente de Chat ESOP de KE&G Construction para candidatos de trabajo. Directo, honesto, sin discurso de reclutamiento. Responde en español. Usa markdown: **negrita** para términos clave.

KE&G es 100% propiedad de empleados, fundada en 1972, Tucson/Sierra Vista AZ. Más de 500 empleados-propietarios.

ESOP: Beneficio de jubilación pagado por la empresa. Tú no pagas nada. KE&G pone acciones a tu nombre cada año según tu salario. Las acciones crecen con la empresa. Cobras en efectivo cuando te vayas o te jubiles.

ADQUISICIÓN: Menos de 2 años: 0%. 2 años: 20%. 3: 40%. 4: 60%. 5: 80%. 6+: 100%. Elegible después de 1,000 horas/año.

Solo ~1 de cada 200 empresas en EE.UU. es totalmente de propiedad de empleados.
Trabajo: carreteras, servicios públicos, sistemas de agua, drenaje, puentes, construcción civil pesada.
Área de servicio: Condados de Pima, Santa Cruz, Cochise, Graham, Greenlee en AZ; Condado Otero NM.
Valores: Seguridad, Integridad, Desarrollo, Excelencia. Solicitar: kegtus.com

NO menciones Blue Diamond Legacy Holdings. TONO: Oraciones cortas, español sencillo.`
  }
};

const SUGGESTED = {
  en: {
    employee: ["How does the ESOP work?", "When do I start getting vested?", "What if I leave before I'm vested?", "What could my ESOP be worth?", "What is Blue Diamond Legacy Holdings?", "When can I collect my money?"],
    prospect: ["What does employee ownership mean for me?", "Do I pay anything to get stock?", "How long until it's mine to keep?", "What could my ESOP be worth?", "What kind of work does KE&G do?"]
  },
  es: {
    employee: ["¿Cómo funciona el ESOP?", "¿Cuándo empiezo a adquirir derechos?", "¿Qué pasa si me voy antes?", "¿Cuánto podría valer mi ESOP?", "¿Qué es Blue Diamond Legacy Holdings?", "¿Cuándo puedo cobrar mi dinero?"],
    prospect: ["¿Qué significa ser propietario empleado?", "¿Pago algo por las acciones?", "¿Cuánto tiempo hasta que sean mías?", "¿Cuánto podría valer mi ESOP?", "¿Qué tipo de trabajo hace KE&G?"]
  }
};

const WELCOME = {
  en: {
    employee: "Hey — I'm here to answer your ESOP questions in plain English. Ask me anything about vesting, your account, when you can collect, or what Blue Diamond Legacy Holdings means. Open the calculator anytime to see what your ownership could be worth.",
    prospect: "Hey — I can answer questions about what it means to work at a 100% employee-owned company. Short version: KE&G puts stock in your name every year, at no cost to you. Ask me anything — or open the calculator to see what that could add up to."
  },
  es: {
    employee: "Hola — estoy aquí para responder tus preguntas sobre el ESOP en español sencillo. Pregúntame sobre adquisición de derechos, tu cuenta, cuándo puedes cobrar, o qué significa Blue Diamond Legacy Holdings. Abre la calculadora cuando quieras para ver cuánto podría valer tu propiedad.",
    prospect: "Hola — puedo responder preguntas sobre lo que significa trabajar en una empresa 100% de propiedad de empleados. En resumen: KE&G pone acciones a tu nombre cada año, sin costo para ti. Pregúntame lo que quieras — o abre la calculadora para ver cuánto podría acumularse."
  }
};

const CALC_RE = /how much|worth|retire|calculat|estimate|project|grow|\$|payout|earn|salary|hourly|account|balance|what.*get|cuánto|vale|jubil|calculad|estima|salario|hora|cuenta|saldo/i;

// ── Markdown renderer ──────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Bullet list
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      const items = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("• "))) {
        items.push(lines[i].trim().replace(/^[-•]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={i} style={{ paddingLeft: 18, margin: "6px 0" }}>
          {items.map((item, j) => (
            <li key={j} style={{ marginBottom: 4, lineHeight: 1.55 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} style={{ margin: "4px 0", lineHeight: 1.65 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Calculator ─────────────────────────────────────────────────────
function buildChartData({ salary, benefitPct, yearsLeft, currentBalance }) {
  const data = [];
  let accum = currentBalance, growth = 0;
  for (let y = 1; y <= yearsLeft; y++) {
    accum += salary * (benefitPct / 100);
    growth = (accum + growth) * 0.05;
    data.push({ year: new Date().getFullYear() + y, allocations: Math.round(accum), priceGrowth: Math.round(growth) });
  }
  return data;
}
function fmt(n) { return "$" + Math.round(n).toLocaleString(); }

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const a = payload[0]?.value || 0, g = payload[1]?.value || 0;
  return (
    <div style={{ background: B.navy, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: B.white, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: B.orange }}>Allocations: {fmt(a)}</div>
      <div style={{ color: "#7aafd4" }}>Growth: +{fmt(g)}</div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 4, paddingTop: 4, fontWeight: 700 }}>Total: {fmt(a + g)}</div>
    </div>
  );
}

function Calculator({ onClose, lang, calcRef }) {
  const t = T[lang];
  const [payType, setPayType] = useState("hourly");
  const [hourly, setHourly] = useState(22);
  const [salary, setSalary] = useState(55000);
  const [benefit, setBenefit] = useState(8);
  const [years, setYears] = useState(20);
  const [balance, setBalance] = useState(0);

  const annSal = payType === "hourly" ? hourly * 2080 : salary;
  const data = buildChartData({ salary: annSal, benefitPct: benefit, yearsLeft: years, currentBalance: balance });
  const last = data[data.length - 1] || { allocations: 0, priceGrowth: 0 };
  const total = last.allocations + last.priceGrowth;
  const perYr = Math.round(total / Math.max(years, 1));
  const retYear = new Date().getFullYear() + years;

  const lbl = { display: "block", fontSize: 10, fontWeight: 700, color: B.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: "Inter, sans-serif" };
  const inp = { background: B.bgPage, border: `1.5px solid ${B.border}`, borderRadius: 6, padding: "6px 9px", fontSize: 13, color: B.black, width: "100%", fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" };
  const badge = { background: B.orange, color: B.white, fontSize: 10, fontWeight: 900, borderRadius: 10, padding: "2px 8px", fontFamily: "Inter, sans-serif" };

  return (
    <div ref={calcRef} style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 12, marginBottom: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(25,36,55,0.15)" }}>
      <div style={{ background: B.grad, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: B.white, fontWeight: 700, fontSize: 13, fontFamily: "Inter, sans-serif" }}>{t.calcTitle}</div>
          <div style={{ color: B.gray, fontSize: 11, fontFamily: "Inter, sans-serif", marginTop: 1 }}>{t.calcSub}</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: B.gray, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div style={{ padding: "16px", display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 185px", minWidth: 170 }}>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{t.payType}</span>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1.5px solid ${B.border}` }}>
              {["hourly","salary"].map(tp => (
                <button key={tp} onClick={() => setPayType(tp)} style={{ flex: 1, padding: "7px 0", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", border: "none", fontFamily: "Inter, sans-serif", background: payType === tp ? B.orange : B.bgPage, color: payType === tp ? B.white : B.mid, transition: "all 0.15s" }}>
                  {tp === "hourly" ? t.hourly : t.salaried}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{payType === "hourly" ? t.hourlyWage : t.annualSalary}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: B.muted, fontSize: 13 }}>$</span>
              {payType === "hourly"
                ? <input type="number" value={hourly} onChange={e => setHourly(+e.target.value || 0)} style={inp} />
                : <input type="number" value={salary} onChange={e => setSalary(+e.target.value || 0)} style={inp} />}
              {payType === "hourly" && <span style={{ fontSize: 10, color: B.muted }}>/hr</span>}
            </div>
            {payType === "hourly" && <div style={{ fontSize: 10, color: B.muted, marginTop: 3, fontFamily: "Inter, sans-serif" }}>≈ {fmt(hourly * 2080)}/year</div>}
          </div>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{t.currentBalance}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: B.muted, fontSize: 13 }}>$</span>
              <input type="number" value={balance} onChange={e => setBalance(+e.target.value || 0)} style={inp} placeholder="0" />
            </div>
            <div style={{ fontSize: 10, color: B.muted, marginTop: 3, fontFamily: "Inter, sans-serif" }}>{t.balanceHint}</div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={lbl}>{t.yearsRetire}</span>
              <span style={badge}>{years}</span>
            </div>
            <input type="range" min={1} max={40} value={years} step={1} onChange={e => setYears(+e.target.value)} style={{ width: "100%", accentColor: B.orange, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: B.muted, marginTop: 2, fontFamily: "Inter, sans-serif" }}><span>1</span><span>40 yrs</span></div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={lbl}>{t.benefitLevel}</span>
              <span style={badge}>{benefit}%</span>
            </div>
            <input type="range" min={1} max={25} value={benefit} step={1} onChange={e => setBenefit(+e.target.value)} style={{ width: "100%", accentColor: B.orange, cursor: "pointer" }} />
            <div style={{ fontSize: 10, color: B.muted, marginTop: 5, lineHeight: 1.5, fontFamily: "Inter, sans-serif" }}>{t.benefitHint}</div>
          </div>
        </div>
        <div style={{ flex: "2 1 240px", minWidth: 220 }}>
          <div style={{ background: B.grad, borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: B.gray, marginBottom: 4, fontFamily: "Inter, sans-serif" }}>{t.estimatedBy} {retYear}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: B.orange, lineHeight: 1, fontFamily: "Inter, sans-serif" }}>{fmt(total)}</div>
            <div style={{ fontSize: 11, color: "#9aaec4", marginTop: 6, fontFamily: "Inter, sans-serif" }}>≈ {fmt(perYr)}{t.perYear}</div>
          </div>
          <div style={{ height: 168 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.orange} stopOpacity={0.85}/><stop offset="95%" stopColor={B.orange} stopOpacity={0.35}/></linearGradient>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.blue} stopOpacity={0.55}/><stop offset="95%" stopColor={B.blue} stopOpacity={0.15}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={B.border}/>
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: B.muted, fontFamily: "Inter, sans-serif" }} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{ fontSize: 10, fill: B.muted, fontFamily: "Inter, sans-serif" }} tickLine={false} width={44} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}/>
                <Tooltip content={<ChartTip />}/>
                <Area type="monotone" dataKey="allocations" stackId="1" stroke={B.orange} fill="url(#gA)" strokeWidth={2}/>
                <Area type="monotone" dataKey="priceGrowth" stackId="1" stroke={B.blue} fill="url(#gG)" strokeWidth={1.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center" }}>
            {[{c: B.orange, l: t.allocations},{c: B.blue, l: t.growth}].map(x => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: B.muted, fontFamily: "Inter, sans-serif" }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }}/>{x.l}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: B.muted, marginTop: 10, lineHeight: 1.5, fontFamily: "Inter, sans-serif" }}>{t.calcDisclaim}</div>
        </div>
      </div>
    </div>
  );
}

// ── Typing dots ────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "12px 16px", alignItems: "center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: B.orange, animation: `kBounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
    </div>
  );
}

// ── Chat bubble with markdown ──────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 9, marginTop: 2, fontSize: 11, fontWeight: 900, color: B.white, fontFamily: "Inter, sans-serif" }}>K</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "10px 14px", fontSize: 14, lineHeight: 1.65,
        fontFamily: "Inter, sans-serif",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? B.orange : B.bgCard,
        color: isUser ? B.white : B.black,
        boxShadow: isUser ? "none" : "0 1px 6px rgba(25,36,55,0.09)",
        border: isUser ? "none" : `1px solid ${B.border}`,
      }}>
        {isUser ? msg.content : renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

// ── Admin Dashboard ────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch("/.netlify/functions/admin-data", {
        headers: { "Authorization": `Bearer ${pw}` }
      });
      if (res.ok) {
        const data = await res.json();
        onLogin(pw, data);
      } else {
        setErr("Incorrect password.");
      }
    } catch {
      setErr("Connection error.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100dvh", background: B.bgPage, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: B.bgCard, borderRadius: 14, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(25,36,55,0.15)" }}>
        <div style={{ background: B.grad, borderRadius: 8, padding: "20px", marginBottom: 28, textAlign: "center" }}>
          <div style={{ color: B.white, fontWeight: 900, fontSize: 18 }}>KE&G ESOP Admin</div>
          <div style={{ color: B.gray, fontSize: 12, marginTop: 4 }}>Dashboard Access</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: B.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Password</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Enter admin password"
            style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}/>
        </div>
        {err && <div style={{ color: "#c0392b", fontSize: 12, marginBottom: 12 }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "11px", background: B.orange, color: B.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          {loading ? "Checking..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ data, password, onLogout }) {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [currentData, setCurrentData] = useState(data);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/.netlify/functions/admin-data", {
        headers: { "Authorization": `Bearer ${password}` }
      });
      if (res.ok) setCurrentData(await res.json());
    } catch {}
    setRefreshing(false);
  };

  const { aggregate, summaries, monthIndex, recentQuestions } = currentData;

  // Chart data for monthly usage trend
  const trendData = [...summaries].reverse().map(s => ({
    month: s.month, total: s.total
  }));

  // Theme breakdown for selected period
  const themeSource = selectedMonth === "all"
    ? aggregate.byTheme
    : (summaries.find(s => s.month === selectedMonth)?.byTheme || {});

  const themeData = Object.entries(themeSource)
    .sort((a,b) => b[1]-a[1])
    .map(([name, value]) => ({ name, value }));

  // Mode breakdown
  const modeSource = selectedMonth === "all" ? aggregate.byMode :
    (summaries.find(s => s.month === selectedMonth)?.byMode || {});

  // Language breakdown
  const langSource = selectedMonth === "all" ? aggregate.byLanguage :
    (summaries.find(s => s.month === selectedMonth)?.byLanguage || {});

  // Top questions for selected period
  const topQs = selectedMonth === "all"
    ? recentQuestions
    : (summaries.find(s => s.month === selectedMonth)?.topQuestions || []);

  const totalForPeriod = selectedMonth === "all" ? aggregate.total :
    (summaries.find(s => s.month === selectedMonth)?.total || 0);

  const card = { background: B.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${B.border}`, boxShadow: "0 2px 8px rgba(25,36,55,0.08)" };
  const cardTitle = { fontWeight: 700, fontSize: 13, color: B.navy, marginBottom: 14, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ minHeight: "100dvh", background: B.bgPage, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: B.grad, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: B.white, fontWeight: 900, fontSize: 16 }}>KE&G ESOP Admin Dashboard</div>
          <div style={{ color: B.gray, fontSize: 11, marginTop: 2 }}>Question analytics & usage tracking</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={refresh} disabled={refreshing} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: B.white, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button onClick={onLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: B.gray, fontSize: 12, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1200 }}>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: B.mid, textTransform: "uppercase", letterSpacing: "0.06em" }}>Filter:</span>
          {["all", ...monthIndex].map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)} style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${selectedMonth === m ? B.orange : B.border}`,
              background: selectedMonth === m ? B.orange : B.bgCard, color: selectedMonth === m ? B.white : B.mid, fontFamily: "Inter, sans-serif", transition: "all 0.15s"
            }}>
              {m === "all" ? "All Time" : m}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Questions", value: totalForPeriod, sub: selectedMonth === "all" ? "all time" : selectedMonth },
            { label: "Employee Mode", value: modeSource.employee || 0, sub: `${totalForPeriod ? Math.round((modeSource.employee||0)/totalForPeriod*100) : 0}% of total` },
            { label: "Prospect Mode", value: modeSource.prospect || 0, sub: `${totalForPeriod ? Math.round((modeSource.prospect||0)/totalForPeriod*100) : 0}% of total` },
            { label: "Spanish", value: langSource.es || 0, sub: `${totalForPeriod ? Math.round((langSource.es||0)/totalForPeriod*100) : 0}% of total` },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: B.navy, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: B.muted, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

          {/* Monthly trend */}
          <div style={card}>
            <div style={cardTitle}>Monthly Usage Trend</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.border}/>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: B.muted }}/>
                  <YAxis tick={{ fontSize: 10, fill: B.muted }} width={32}/>
                  <Tooltip/>
                  <Bar dataKey="total" fill={B.orange} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Theme breakdown pie */}
          <div style={card}>
            <div style={cardTitle}>Questions by Theme</div>
            {themeData.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={themeData} dataKey="value" cx="40%" cy="50%" outerRadius={80} label={false}>
                      {themeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                    </Pie>
                    <Legend layout="vertical" align="right" verticalAlign="middle"
                      formatter={(value) => <span style={{ fontSize: 10, color: B.mid }}>{value}</span>}/>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: B.muted, fontSize: 13 }}>No data for this period</div>
            )}
          </div>
        </div>

        {/* Theme breakdown bar + top questions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Theme bars */}
          <div style={card}>
            <div style={cardTitle}>Theme Breakdown</div>
            {themeData.length === 0 ? (
              <div style={{ color: B.muted, fontSize: 13 }}>No data yet</div>
            ) : themeData.map((t, i) => (
              <div key={t.name} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: B.mid, fontWeight: 500 }}>{t.name}</span>
                  <span style={{ color: B.navy, fontWeight: 700 }}>{t.value}</span>
                </div>
                <div style={{ height: 7, background: B.bgPage, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(t.value / (themeData[0]?.value || 1)) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 4, transition: "width 0.5s" }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Recent questions */}
          <div style={card}>
            <div style={cardTitle}>Recent Questions</div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {topQs.length === 0 ? (
                <div style={{ color: B.muted, fontSize: 13 }}>No questions logged yet</div>
              ) : topQs.slice(0, 30).map((q, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < topQs.length-1 ? `1px solid ${B.border}` : "none" }}>
                  <div style={{ fontSize: 13, color: B.black, marginBottom: 3 }}>{q.question}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, background: B.bgPage, color: B.muted, padding: "2px 7px", borderRadius: 10 }}>{q.theme}</span>
                    <span style={{ fontSize: 10, color: B.muted }}>{q.mode}</span>
                    <span style={{ fontSize: 10, color: B.muted, marginLeft: "auto" }}>{q.timestamp ? new Date(q.timestamp).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Admin() {
  const [adminData, setAdminData] = useState(null);
  const [password, setPassword] = useState("");

  if (!adminData) return <AdminLogin onLogin={(pw, data) => { setPassword(pw); setAdminData(data); }}/>;
  return <AdminDashboard data={adminData} password={password} onLogout={() => { setAdminData(null); setPassword(""); }}/>;
}

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  // Route: /admin goes to admin dashboard
  if (window.location.pathname === "/admin") return <Admin/>;

  const [mode, setMode] = useState(null);
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const bottomRef = useRef(null);
  const calcRef = useRef(null);
  const inputRef = useRef(null);
  const history = useRef([]);
  const t = T[lang];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // When calculator opens, scroll to it instead of top
  useEffect(() => {
    if (showCalc && calcRef.current) {
      setTimeout(() => calcRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  }, [showCalc]);

  const startMode = (m) => {
    setMode(m); history.current = [];
    setMessages([{ role: "assistant", content: WELCOME[lang][m] }]);
    setShowCalc(false);
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    if (CALC_RE.test(userText) && !showCalc) setShowCalc(true);

    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    history.current.push({ role: "user", content: userText });
    setLoading(true);

    // Log question (fire and forget)
    fetch("/.netlify/functions/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: userText, mode, language: lang }),
    }).catch(() => {});

    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM[lang][mode], messages: history.current }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || data.reply || "Something went wrong. Try again.";
      history.current.push({ role: "assistant", content: reply });
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Connection error — please try again." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Mr+Dafoe&display=swap');
    @keyframes kBounce { 0%,80%,100%{transform:scale(0.65);opacity:0.45} 40%{transform:scale(1);opacity:1} }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Inter', sans-serif; background: ${B.bgPage}; }
    textarea:focus, input:focus { outline: none; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: ${B.border}; border-radius: 3px; }
    input[type=range] { accent-color: ${B.orange}; }
    ul { list-style-type: disc; }
  `;

  // ── Landing ──────────────────────────────────────────────────────
  if (!mode) return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: B.bgPage, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>
      <div style={{ background: B.grad, padding: "22px 32px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="48" height="32" viewBox="0 0 120 80" fill="none">
              <polygon points="60,4 116,40 60,76 4,40" stroke="white" strokeWidth="5" fill="none"/>
              <text x="60" y="50" textAnchor="middle" fill="white" fontSize="26" fontWeight="900" fontFamily="Inter,sans-serif">KE&amp;G</text>
            </svg>
            <div>
              <div style={{ color: B.white, fontWeight: 900, fontSize: 17, fontFamily: "Inter, sans-serif" }}>KE&G CONSTRUCTION</div>
              <div style={{ color: B.gray, fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>100% Employee Owned</div>
            </div>
          </div>
          <button onClick={() => setLang(l => l === "en" ? "es" : "en")} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: B.white, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {lang === "en" ? t.spanish : t.english}
          </button>
        </div>
        <div style={{ fontFamily: "'Mr Dafoe', cursive", fontSize: 40, color: B.orange, lineHeight: 1.1, marginBottom: 8 }}>{t.tagline}</div>
        <div style={{ color: "#c8d0dc", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
          {lang === "en" ? "Plain-language answers about your employee ownership — plus a calculator to see what it could be worth." : "Respuestas en español sencillo sobre tu propiedad de empleado — más una calculadora para ver cuánto podría valer."}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 500 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: B.navy, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter, sans-serif", marginBottom: 16, textAlign: "center" }}>{t.whoAreYou}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: "employee", label: t.employeeLabel, sub: t.employeeSub },
              { key: "prospect", label: t.prospectLabel, sub: t.prospectSub }
            ].map(opt => (
              <button key={opt.key} onClick={() => startMode(opt.key)}
                style={{ background: B.bgCard, border: `2px solid ${B.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 13, fontFamily: "'Inter', sans-serif", transition: "all 0.18s", width: "100%" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = B.orange; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(244,121,44,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: B.orange, flexShrink: 0, marginTop: 6 }}/>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: B.navy, marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: B.muted, lineHeight: 1.55 }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: B.grad, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <svg width="26" height="17" viewBox="0 0 120 80" fill="none">
          <polygon points="60,4 116,40 60,76 4,40" stroke="white" strokeWidth="6" fill="none"/>
          <text x="60" y="50" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="Inter,sans-serif">KE&amp;G</text>
        </svg>
        <span style={{ color: "#8a9ab4", fontSize: 11, fontFamily: "Inter, sans-serif" }}>{t.footer}</span>
      </div>
    </div>
  );

  // ── Chat ─────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: B.bgPage, height: "100dvh", display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto" }}>
      <style>{css}</style>
      <div style={{ background: B.grad, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: B.white, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>K</div>
          <div>
            <div style={{ color: B.white, fontWeight: 700, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>{t.title}</div>
            <div style={{ color: B.gray, fontSize: 11, fontFamily: "'Inter', sans-serif" }}>{mode === "employee" ? t.employeeMode : t.prospectMode}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <button onClick={() => setLang(l => l === "en" ? "es" : "en")} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: B.gray, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {lang === "en" ? t.spanish : t.english}
          </button>
          <button onClick={() => setShowCalc(v => !v)} style={{ background: showCalc ? B.orange : "transparent", border: `1.5px solid ${showCalc ? B.orange : "rgba(255,255,255,0.3)"}`, color: showCalc ? B.white : B.gray, fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}>
            {showCalc ? t.closeCalc : t.openCalc}
          </button>
          <button onClick={() => { setMode(null); setMessages([]); setShowCalc(false); history.current = []; }}
            style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", color: B.gray, fontSize: 11, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {t.switchMode}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px" }}>
        {messages.map((msg, i) => <Bubble key={i} msg={msg}/>)}
        {/* Calculator renders AFTER messages so it appears at current scroll position */}
        {showCalc && <Calculator onClose={() => setShowCalc(false)} lang={lang} calcRef={calcRef}/>}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 9, fontSize: 11, fontWeight: 900, color: B.white, fontFamily: "'Inter', sans-serif" }}>K</div>
            <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: "16px 16px 16px 4px" }}><TypingDots/></div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: B.muted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>{t.commonQ}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTED[lang][mode].map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                style={{ background: B.bgCard, border: `1.5px solid ${B.border}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, color: B.mid, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = B.orange; e.currentTarget.style.color = B.orange; e.currentTarget.style.background = "#FFF4EE"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.color = B.mid; e.currentTarget.style.background = B.bgCard; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "10px 16px 14px", background: B.grad, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "flex-end", background: B.bgCard, border: `1.5px solid rgba(255,255,255,0.15)`, borderRadius: 11, padding: "9px 11px", transition: "border-color 0.15s" }}
          onFocusCapture={e => e.currentTarget.style.borderColor = B.orange}
          onBlurCapture={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t.placeholder} rows={1}
            style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: 14, fontFamily: "'Inter', sans-serif", color: B.black, lineHeight: 1.5, maxHeight: 90, overflowY: "auto" }}/>
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 32, height: 32, borderRadius: "50%", background: input.trim() && !loading ? B.orange : B.border, border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: "#7a8aa0", textAlign: "center", margin: "7px 0 0", fontFamily: "'Inter', sans-serif" }}>{t.disclaimer}</p>
      </div>
    </div>
  );
}
