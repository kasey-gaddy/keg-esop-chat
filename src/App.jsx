import { useState, useRef, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

// ── Brand ─────────────────────────────────────────────────────────
const B = {
  orange: "#F4792C", navy: "#192437", blue: "#253B80",
  gray: "#BDBEC1", white: "#FFFFFF", black: "#020304",
  bgPage: "#F4F5F7", bgCard: "#FFFFFF", border: "#DDE0E8",
  muted: "#6B7080", mid: "#3A3D4A",
  grad: "linear-gradient(90deg, #192437 0%, #253B80 100%)",
};
const PIE_COLORS = ["#F4792C","#253B80","#192437","#5B8DB8","#A0B4CC","#D4865A","#7C9DBF","#E8A87C","#4A6FA5","#2E7D52"];

// ── Session ID (unique per browser session for user counting) ─────
const SESSION_ID = Math.random().toString(36).slice(2, 10);

// ── i18n ──────────────────────────────────────────────────────────
const T = {
  en: {
    title: "ESOP Ownership Assistant", employeeMode: "Employee-Owner Mode", prospectMode: "Prospective Hire Mode",
    openCalc: "Open Calculator", closeCalc: "✕ Close Calc", switchMode: "Switch Mode",
    spanish: "Español", english: "English", whoAreYou: "Who are you?",
    employeeLabel: "I'm a KE&G employee-owner", employeeSub: "Ask about vesting, your account, payouts, BDL, and what ownership really means for your retirement.",
    prospectLabel: "I'm exploring a career at KE&G", prospectSub: "Learn what employee ownership means in practice — and why it makes KE&G different from most employers.",
    tagline: "Constructing Legacies.", footer: "Employee-Owned Since 2014 · Constructing Legacies.",
    placeholder: "Ask about the ESOP…", disclaimer: "Estimates only — for account specifics, contact the Benefits Administration team. · KE&G Construction",
    commonQ: "Common questions", calcTitle: "ESOP Wealth Calculator", calcSub: "See what your ownership could be worth at retirement",
    payType: "Pay type", hourly: "Hourly", salaried: "Salaried", hourlyWage: "Hourly wage", annualSalary: "Annual salary",
    currentBalance: "Current ESOP balance", balanceHint: "From your last annual statement",
    yearsRetire: "Years until retirement", benefitLevel: "Annual benefit level",
    benefitHint: "KE&G's historical average is ~8%. Contact the Benefits Administration team for your current rate.",
    estimatedBy: "Estimated value by", perYear: "/year — at no cost out of your paycheck",
    allocations: "Annual allocations", growth: "Share price growth",
    calcDisclaim: "Estimate only. Assumes ~5% annual share price growth. Not financial advice — contact the Benefits Administration team for specifics.",
  },
  es: {
    title: "Asistente de Propiedad ESOP", employeeMode: "Modo Empleado-Propietario", prospectMode: "Modo Candidato",
    openCalc: "Abrir Calculadora", closeCalc: "✕ Cerrar Calc", switchMode: "Cambiar Modo",
    spanish: "Español", english: "English", whoAreYou: "¿Quién eres?",
    employeeLabel: "Soy empleado-propietario de KE&G", employeeSub: "Pregunta sobre la adquisición de derechos, tu cuenta, pagos, BDL y lo que significa la propiedad para tu jubilación.",
    prospectLabel: "Estoy explorando una carrera en KE&G", prospectSub: "Aprende lo que significa la propiedad de empleados en la práctica.",
    tagline: "Construyendo Legados.", footer: "Propiedad de Empleados desde 2014 · Construyendo Legados.",
    placeholder: "Pregunta sobre el ESOP…", disclaimer: "Solo estimaciones — para detalles de tu cuenta, contacta al equipo de Administración de Beneficios. · KE&G Construction",
    commonQ: "Preguntas frecuentes", calcTitle: "Calculadora de Riqueza ESOP", calcSub: "Descubre cuánto podría valer tu propiedad al jubilarte",
    payType: "Tipo de pago", hourly: "Por hora", salaried: "Asalariado", hourlyWage: "Salario por hora", annualSalary: "Salario anual",
    currentBalance: "Saldo ESOP actual", balanceHint: "De tu último estado de cuenta anual",
    yearsRetire: "Años hasta la jubilación", benefitLevel: "Nivel de beneficio anual",
    benefitHint: "El promedio histórico de KE&G es ~8%. Contacta al equipo de Administración de Beneficios para tu tasa actual.",
    estimatedBy: "Valor estimado en", perYear: "/año — sin costo de tu cheque",
    allocations: "Asignaciones anuales", growth: "Crecimiento del precio de acción",
    calcDisclaim: "Solo estimación. Asume ~5% crecimiento anual. No es asesoría financiera.",
  }
};

// ── System prompts ────────────────────────────────────────────────
const BASE_RULES = `
FORMATTING: Use **bold** for key terms. Use bullet points with - for lists. Short sentences.
BENEFITS TEAM: Never say "HR" or "contact HR". Always say "contact the Benefits Administration team".
`;

const SYSTEM = {
  en: {
    employee: `You are the KE&G Construction ESOP Knowledge Assistant for employee-owners. Answer in plain language like talking to someone on a job site. Use **bold** for key terms, bullet points with - for lists. Short sentences, no jargon.
${BASE_RULES}
KE&G Construction is 100% employee-owned, founded 1972, Tucson/Sierra Vista AZ. Plan: Blue Diamond Legacy Holdings, Inc. ESOP. BDL is the holding company that owns KE&G — that's why employees see BDL on paperwork.

ELIGIBILITY: Eligible after 1,000 hrs/year. Join plan Jan 1 of that year. Company funds it entirely — you put in zero.

VESTING (yours to keep):
- Under 2 years: 0%
- 2 years: 20%
- 3 years: 40%
- 4 years: 60%
- 5 years: 80%
- 6+ years: 100% — fully yours
- Auto 100% vested at age 65 while employed, or death/disability on the job
- Leave early: keep only your vested %. Unvested forfeited after 5-year break in service

WHEN YOU GET PAID:
**Retirement (65+), Disability, or Death:** First payment the year AFTER you leave. Example: Leave 2025 → paid 2026.
**All other exits (quit, laid off, fired):** Mandatory 5-year wait. Distributions start year 6. Example: Leave 2025 → first check 2032.
**Payout amounts:**
- Vested balance $1,000 or less: automatic lump sum, no election needed
- Vested balance $1,001 to $7,000: you may elect a lump sum by end of the following plan year
- Vested balance over $7,000: installments over up to 5 years
- Always paid in cash, not stock (KE&G is S-corp)

REHIRE RULES (if someone leaves and comes back):
- Rejoins plan immediately on rehire date
- Was vested when left: prior vesting service reinstated. If gone 5+ consecutive years, pre-break and post-break accounts tracked separately — new service won't increase vesting % on old balance
- Was NOT vested, break less than 5 years: vesting service AND unvested balance fully reinstated
- Was NOT vested, break 5+ consecutive years: treated as brand new employee for vesting purposes

DIVERSIFICATION (age 55+ with 10+ years participation):
- Can move up to 25%/yr of shares into other investments for first 5 years of eligibility
- Year 6: up to 50%. After that the window closes — use it or lose it
- Never required — your choice

TAXES: No taxes while growing. 20% federal withholding at distribution unless rolled to IRA. Before 59.5 may add 10% penalty. Always recommend consulting a tax advisor.

CALCULATOR: When asked about account value or projections, mention the Wealth Calculator button at the top.

Defer specific account questions (balance, exact dates, individual situations) to the Benefits Administration team.`,

    prospect: `You are the KE&G Construction ESOP Chat Assistant for job seekers. Direct, honest, no recruiting fluff. Use **bold** for key terms, bullet points with - for lists.
${BASE_RULES}
KE&G is 100% employee-owned, founded 1972, Tucson/Sierra Vista AZ. 500+ employee-owners. "Constructing Legacies."

ESOP: Company-funded retirement benefit. You pay nothing. KE&G puts stock in your name each year based on your pay. You collect in cash when you leave or retire.

VESTING (how long until shares are yours to keep):
- Under 2 years: 0%
- 2 years: 20%, 3 years: 40%, 4 years: 60%, 5 years: 80%, 6+: 100%
- Eligible after 1,000 hours/year

Only ~1 in 200 US companies is fully employee-owned. When KE&G wins, your retirement grows.
Work: roads, utilities, water systems, drainage, bridges, heavy civil, mine site work, JOC contracts.
Service area: Pima, Santa Cruz, Cochise, Graham, Greenlee counties AZ; Otero County NM.
Values: Safety, Integrity, Development, Excellence. Apply: kegtus.com

CALCULATOR: If asked what ESOP could be worth, mention the calculator button at top.
Do NOT mention Blue Diamond Legacy Holdings. Contact the Benefits Administration team for specifics.`
  },
  es: {
    employee: `Eres el Asistente de Conocimiento ESOP de KE&G Construction para empleados-propietarios. Responde en español sencillo. Usa **negrita** para términos clave, viñetas con - para listas.
${BASE_RULES}
KE&G es 100% propiedad de empleados, fundada 1972, Tucson/Sierra Vista AZ.

ADQUISICIÓN DE DERECHOS:
- Menos de 2 años: 0%, 2 años: 20%, 3: 40%, 4: 60%, 5: 80%, 6+: 100%
- Automático al 100% a los 65 años o por muerte/discapacidad en el trabajo

CUÁNDO COBRAS:
**Jubilación (65+), Discapacidad o Muerte:** Primer pago el año DESPUÉS de irte.
**Cualquier otra salida:** Espera obligatoria de 5 años. Distribuciones empiezan en el año 6.
**Montos:**
- Saldo de $1,000 o menos: suma global automática
- Saldo de $1,001 a $7,000: puedes elegir suma global
- Saldo mayor a $7,000: pagos en cuotas hasta 5 años

REGLAS DE RECONTRATACIÓN:
- Si eras elegible y regresaste en menos de 5 años: servicio y saldo se reinstalan
- Si eras elegible y regresaste después de 5+ años: cuentas pre y post-pausa separadas
- Si no eras elegible y regresaste en menos de 5 años: todo se reinstala
- Si no eras elegible y regresaste después de 5+ años: se te trata como empleado nuevo

DIVERSIFICACIÓN: 55+ años con 10+ años de participación: puedes diversificar hasta 25%/año x5 años, luego 50% en año 6.

Contacta al equipo de Administración de Beneficios para preguntas específicas de tu cuenta. No digas "HR".`,

    prospect: `Eres el Asistente de Chat ESOP de KE&G para candidatos. Directo, honesto, en español. Usa **negrita** para términos clave.
${BASE_RULES}
KE&G es 100% propiedad de empleados, fundada 1972. La empresa pone acciones a tu nombre cada año sin costo para ti.
Adquisición: menos de 2 años=0%, 2=20%, 3=40%, 4=60%, 5=80%, 6+=100%.
Solo ~1 de cada 200 empresas en EE.UU. es 100% de empleados. Aplica en kegtus.com.
Contacta al equipo de Administración de Beneficios. No digas "HR". No menciones Blue Diamond Legacy Holdings.`
  }
};

const DEFAULT_QUESTIONS = {
  en: {
    employee: ["How does the ESOP work?","When do I start getting vested?","What if I leave before I'm vested?","What could my ESOP be worth?","What is Blue Diamond Legacy Holdings?","When can I collect my money?"],
    prospect: ["What does employee ownership mean for me?","Do I pay anything to get stock?","How long until it's mine to keep?","What could my ESOP be worth?","What kind of work does KE&G do?"],
  },
  es: {
    employee: ["¿Cómo funciona el ESOP?","¿Cuándo empiezo a adquirir derechos?","¿Qué pasa si me voy antes?","¿Cuánto podría valer mi ESOP?","¿Qué es Blue Diamond Legacy Holdings?","¿Cuándo puedo cobrar mi dinero?"],
    prospect: ["¿Qué significa ser propietario empleado?","¿Pago algo por las acciones?","¿Cuánto tiempo hasta que sean mías?","¿Cuánto podría valer mi ESOP?","¿Qué tipo de trabajo hace KE&G?"],
  },
};

const WELCOME = {
  en: {
    employee: "Hey — I'm here to answer your ESOP questions in plain English. Ask me anything about vesting, your account, when you can collect, or what Blue Diamond Legacy Holdings means. Open the calculator anytime to see what your ownership could be worth.",
    prospect: "Hey — I can answer questions about what it means to work at a 100% employee-owned company. Short version: KE&G puts stock in your name every year, at no cost to you. Ask me anything — or open the calculator to see what that could add up to."
  },
  es: {
    employee: "Hola — estoy aquí para responder tus preguntas sobre el ESOP en español sencillo. Pregúntame sobre adquisición de derechos, tu cuenta, cuándo puedes cobrar, o qué significa Blue Diamond Legacy Holdings.",
    prospect: "Hola — puedo responder preguntas sobre lo que significa trabajar en una empresa 100% de propiedad de empleados. KE&G pone acciones a tu nombre cada año, sin costo para ti."
  }
};

const CALC_RE = /how much|worth|retire|calculat|estimate|project|grow|\$|payout|earn|salary|hourly|account|balance|what.*get|cuánto|vale|jubil|calculad|estima|salario|hora|cuenta|saldo/i;

// ── Markdown renderer ─────────────────────────────────────────────
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2,-2)}</strong> : p
  );
}
function renderMarkdown(text) {
  const elements = [];
  let i = 0;
  const lines = text.split("\n");
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      const items = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("• "))) {
        items.push(lines[i].trim().replace(/^[-•]\s+/, "")); i++;
      }
      elements.push(<ul key={i} style={{ paddingLeft: 18, margin: "6px 0" }}>{items.map((it, j) => <li key={j} style={{ marginBottom: 3, lineHeight: 1.55 }}>{renderInline(it)}</li>)}</ul>);
    } else {
      elements.push(<p key={i} style={{ margin: "4px 0", lineHeight: 1.65 }}>{renderInline(line)}</p>);
      i++;
    }
  }
  return elements;
}

// ── Calculator ────────────────────────────────────────────────────
function buildChartData({ salary, benefitPct, yearsLeft, currentBalance }) {
  const data = []; let accum = currentBalance, growth = 0;
  for (let y = 1; y <= yearsLeft; y++) {
    accum += salary * (benefitPct / 100);
    growth = (accum + growth) * 0.05;
    data.push({ year: new Date().getFullYear() + y, allocations: Math.round(accum), priceGrowth: Math.round(growth) });
  }
  return data;
}
const fmt = n => "$" + Math.round(n).toLocaleString();

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const a = payload[0]?.value||0, g = payload[1]?.value||0;
  return <div style={{ background: B.navy, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: B.white, fontFamily: "Inter,sans-serif" }}>
    <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
    <div style={{ color: B.orange }}>Allocations: {fmt(a)}</div>
    <div style={{ color: "#7aafd4" }}>Growth: +{fmt(g)}</div>
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 4, paddingTop: 4, fontWeight: 700 }}>Total: {fmt(a+g)}</div>
  </div>;
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
  const last = data[data.length-1] || { allocations: 0, priceGrowth: 0 };
  const total = last.allocations + last.priceGrowth;
  const perYr = Math.round(total / Math.max(years, 1));
  const retYear = new Date().getFullYear() + years;
  const lbl = { display: "block", fontSize: 10, fontWeight: 700, color: B.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 };
  const inp = { background: B.bgPage, border: `1.5px solid ${B.border}`, borderRadius: 6, padding: "6px 9px", fontSize: 13, color: B.black, width: "100%", fontFamily: "Inter,sans-serif", boxSizing: "border-box", outline: "none" };
  const badge = { background: B.orange, color: B.white, fontSize: 10, fontWeight: 900, borderRadius: 10, padding: "2px 8px" };
  return (
    <div ref={calcRef} style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 12, marginBottom: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(25,36,55,0.15)" }}>
      <div style={{ background: B.grad, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ color: B.white, fontWeight: 700, fontSize: 13 }}>{t.calcTitle}</div><div style={{ color: B.gray, fontSize: 11, marginTop: 1 }}>{t.calcSub}</div></div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: B.gray, fontSize: 20, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ padding: 16, display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 185px", minWidth: 170 }}>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{t.payType}</span>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1.5px solid ${B.border}` }}>
              {["hourly","salary"].map(tp => <button key={tp} onClick={() => setPayType(tp)} style={{ flex: 1, padding: "7px 0", fontSize: 10, fontWeight: 900, textTransform: "uppercase", cursor: "pointer", border: "none", fontFamily: "Inter,sans-serif", background: payType===tp ? B.orange : B.bgPage, color: payType===tp ? B.white : B.mid, transition: "all 0.15s" }}>{tp==="hourly" ? t.hourly : t.salaried}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{payType==="hourly" ? t.hourlyWage : t.annualSalary}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: B.muted, fontSize: 13 }}>$</span>
              {payType==="hourly" ? <input type="number" value={hourly} onChange={e => setHourly(+e.target.value||0)} style={inp}/> : <input type="number" value={salary} onChange={e => setSalary(+e.target.value||0)} style={inp}/>}
              {payType==="hourly" && <span style={{ fontSize: 10, color: B.muted }}>/hr</span>}
            </div>
            {payType==="hourly" && <div style={{ fontSize: 10, color: B.muted, marginTop: 3 }}>≈ {fmt(hourly*2080)}/year</div>}
          </div>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{t.currentBalance}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: B.muted, fontSize: 13 }}>$</span><input type="number" value={balance} onChange={e => setBalance(+e.target.value||0)} style={inp} placeholder="0"/></div>
            <div style={{ fontSize: 10, color: B.muted, marginTop: 3 }}>{t.balanceHint}</div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={lbl}>{t.yearsRetire}</span><span style={badge}>{years}</span></div>
            <input type="range" min={1} max={40} value={years} step={1} onChange={e => setYears(+e.target.value)} style={{ width: "100%", accentColor: B.orange, cursor: "pointer" }}/>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: B.muted, marginTop: 2 }}><span>1</span><span>40 yrs</span></div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={lbl}>{t.benefitLevel}</span><span style={badge}>{benefit}%</span></div>
            <input type="range" min={1} max={25} value={benefit} step={1} onChange={e => setBenefit(+e.target.value)} style={{ width: "100%", accentColor: B.orange, cursor: "pointer" }}/>
            <div style={{ fontSize: 10, color: B.muted, marginTop: 5, lineHeight: 1.5 }}>{t.benefitHint}</div>
          </div>
        </div>
        <div style={{ flex: "2 1 240px", minWidth: 220 }}>
          <div style={{ background: B.grad, borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: B.gray, marginBottom: 4 }}>{t.estimatedBy} {retYear}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: B.orange, lineHeight: 1 }}>{fmt(total)}</div>
            <div style={{ fontSize: 11, color: "#9aaec4", marginTop: 6 }}>≈ {fmt(perYr)}{t.perYear}</div>
          </div>
          <div style={{ height: 168 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.orange} stopOpacity={0.85}/><stop offset="95%" stopColor={B.orange} stopOpacity={0.35}/></linearGradient>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.blue} stopOpacity={0.55}/><stop offset="95%" stopColor={B.blue} stopOpacity={0.15}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={B.border}/>
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: B.muted }} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{ fontSize: 10, fill: B.muted }} tickLine={false} width={44} tickFormatter={v => v>=1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="allocations" stackId="1" stroke={B.orange} fill="url(#gA)" strokeWidth={2}/>
                <Area type="monotone" dataKey="priceGrowth" stackId="1" stroke={B.blue} fill="url(#gG)" strokeWidth={1.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center" }}>
            {[{c:B.orange,l:t.allocations},{c:B.blue,l:t.growth}].map(x => <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: B.muted }}><div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }}/>{x.l}</div>)}
          </div>
          <div style={{ fontSize: 9, color: B.muted, marginTop: 10, lineHeight: 1.5 }}>{t.calcDisclaim}</div>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return <div style={{ display: "flex", gap: 5, padding: "12px 16px", alignItems: "center" }}>
    {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: B.orange, animation: `kBounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
  </div>;
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
    {!isUser && <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 9, marginTop: 2, fontSize: 11, fontWeight: 900, color: B.white }}>K</div>}
    <div style={{ maxWidth: "78%", padding: "10px 14px", fontSize: 14, lineHeight: 1.65, fontFamily: "Inter,sans-serif", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isUser ? B.orange : B.bgCard, color: isUser ? B.white : B.black, boxShadow: isUser ? "none" : "0 1px 6px rgba(25,36,55,0.09)", border: isUser ? "none" : `1px solid ${B.border}` }}>
      {isUser ? msg.content : renderMarkdown(msg.content)}
    </div>
  </div>;
}

// ── Admin ─────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch("/.netlify/functions/admin-data", { headers: { "Authorization": `Bearer ${pw}` } });
      if (res.status === 401) { setErr("Incorrect password."); setLoading(false); return; }
      if (!res.ok) { setErr(`Server error (${res.status}) — check Netlify function logs.`); setLoading(false); return; }
      onLogin(pw, await res.json());
    } catch(e) { setErr("Connection error: " + e.message); }
    setLoading(false);
  };
  return <div style={{ minHeight: "100dvh", background: B.bgPage, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
    <div style={{ background: B.bgCard, borderRadius: 14, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(25,36,55,0.15)" }}>
      <div style={{ background: B.grad, borderRadius: 8, padding: 20, marginBottom: 28, textAlign: "center" }}>
        <div style={{ color: B.white, fontWeight: 900, fontSize: 18 }}>KE&G ESOP Admin</div>
        <div style={{ color: B.gray, fontSize: 12, marginTop: 4 }}>Dashboard Access</div>
      </div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: B.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Password</label>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} placeholder="Enter admin password"
        style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 12 }}/>
      {err && <div style={{ color: "#c0392b", fontSize: 12, marginBottom: 12 }}>{err}</div>}
      <button onClick={submit} disabled={loading} style={{ width: "100%", padding: 11, background: B.orange, color: B.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
        {loading ? "Checking..." : "Sign In"}
      </button>
    </div>
  </div>;
}

function DocumentsTab({ password, docIndex, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [deleting, setDeleting] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setMsg("");
    try {
      const text = await file.text();
      const res = await fetch("/.netlify/functions/upload-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${password}` },
        body: JSON.stringify({ name: file.name, content: text, fileType: file.type }),
      });
      const data = await res.json();
      if (data.success) { setMsg(`✓ "${file.name}" uploaded successfully.`); onRefresh(); }
      else setMsg("Error: " + (data.error || "Upload failed"));
    } catch(err) { setMsg("Error: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };

  const deleteDoc = async (docId, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(docId);
    try {
      await fetch("/.netlify/functions/admin-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${password}` },
        body: JSON.stringify({ action: "deleteDoc", docId }),
      });
      onRefresh();
    } catch(err) { setMsg("Delete error: " + err.message); }
    setDeleting(null);
  };

  return <div>
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: B.navy, marginBottom: 6 }}>Reference Documents</div>
      <div style={{ fontSize: 13, color: B.muted, lineHeight: 1.6, marginBottom: 16 }}>
        Upload PDF, Word, or text documents. The chatbot will search these when answering questions and cite the document by name. Supported: .txt, .pdf (text will be extracted), .docx (text content).
      </div>
      <label style={{ display: "inline-block", background: B.orange, color: B.white, padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
        {uploading ? "Uploading..." : "Upload Document"}
        <input type="file" accept=".txt,.pdf,.docx,.doc" onChange={handleFile} disabled={uploading} style={{ display: "none" }}/>
      </label>
      {msg && <div style={{ marginTop: 12, fontSize: 12, color: msg.startsWith("✓") ? "#1a7a4a" : "#c0392b" }}>{msg}</div>}
    </div>
    {docIndex.docs.length === 0 ? (
      <div style={{ background: B.bgCard, borderRadius: 12, padding: 32, border: `1px solid ${B.border}`, textAlign: "center", color: B.muted, fontSize: 13 }}>
        No documents uploaded yet. Upload your SPD, distribution guidelines, or other policy documents to have the chatbot reference them.
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {docIndex.docs.map(doc => (
          <div key={doc.id} style={{ background: B.bgCard, borderRadius: 10, padding: "14px 18px", border: `1px solid ${B.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: B.navy, marginBottom: 3 }}>{doc.name}</div>
              <div style={{ fontSize: 11, color: B.muted }}>
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} · {Math.round(doc.size / 1000)}KB
              </div>
            </div>
            <button onClick={() => deleteDoc(doc.id, doc.name)} disabled={deleting === doc.id}
              style={{ background: "#fee", border: "1px solid #fcc", color: "#c0392b", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
              {deleting === doc.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>;
}

function QuestionsTab({ questions, password, onSaved }) {
  const [q, setQ] = useState(JSON.parse(JSON.stringify(questions)));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const update = (lang, mode, idx, val) => { const n = JSON.parse(JSON.stringify(q)); n[lang][mode][idx] = val; setQ(n); };
  const addQ = (lang, mode) => { const n = JSON.parse(JSON.stringify(q)); n[lang][mode].push(""); setQ(n); };
  const removeQ = (lang, mode, idx) => { const n = JSON.parse(JSON.stringify(q)); n[lang][mode].splice(idx,1); setQ(n); };
  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/.netlify/functions/admin-data", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${password}` },
        body: JSON.stringify({ action: "saveQuestions", questions: q }),
      });
      const data = await res.json();
      if (data.success) { setMsg("✓ Saved — questions updated on the live chatbot."); onSaved(q); }
      else setMsg("Error: " + (data.error || "Unknown"));
    } catch(e) { setMsg("Error: " + e.message); }
    setSaving(false);
  };
  const inp = { width: "100%", padding: "7px 10px", border: `1.5px solid ${B.border}`, borderRadius: 6, fontSize: 13, fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" };
  const sections = [
    { lang:"en", mode:"employee", label:"English — Employee Mode" },
    { lang:"en", mode:"prospect", label:"English — Prospect Mode" },
    { lang:"es", mode:"employee", label:"Spanish — Employee Mode" },
    { lang:"es", mode:"prospect", label:"Spanish — Prospect Mode" },
  ];
  return <div>
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: B.navy, marginBottom: 6 }}>Edit Suggested Questions</div>
      <div style={{ fontSize: 13, color: B.muted, lineHeight: 1.6 }}>These chips appear when users first open the chat. Changes take effect immediately.</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
      {sections.map(({ lang, mode, label }) => (
        <div key={`${lang}-${mode}`} style={{ background: B.bgCard, borderRadius: 12, padding: 18, border: `1px solid ${B.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: B.navy, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{label}</div>
          {(q[lang]?.[mode]||[]).map((question, idx) => (
            <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 7 }}>
              <input value={question} onChange={e => update(lang,mode,idx,e.target.value)} style={{ ...inp, flex: 1 }} placeholder={`Question ${idx+1}`}/>
              <button onClick={() => removeQ(lang,mode,idx)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c0392b", borderRadius: 5, padding: "0 10px", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
            </div>
          ))}
          <button onClick={() => addQ(lang,mode)} style={{ marginTop: 6, background: B.bgPage, border: `1.5px dashed ${B.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, color: B.muted, cursor: "pointer", width: "100%", fontFamily: "Inter,sans-serif" }}>+ Add question</button>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <button onClick={save} disabled={saving} style={{ background: B.orange, color: B.white, border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
        {saving ? "Saving..." : "Save Questions"}
      </button>
      {msg && <div style={{ fontSize: 12, color: msg.startsWith("✓") ? "#1a7a4a" : "#c0392b" }}>{msg}</div>}
    </div>
  </div>;
}

function AdminDashboard({ data, password, onLogout }) {
  const [tab, setTab] = useState("analytics");
  const [refreshing, setRefreshing] = useState(false);
  const [d, setD] = useState(data);
  const [monthFilter, setMonthFilter] = useState("all");

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/.netlify/functions/admin-data", { headers: { "Authorization": `Bearer ${password}` } });
      if (res.ok) setD(await res.json());
    } catch {}
    setRefreshing(false);
  };

  const { aggregate, summaries, monthIndex, recentQuestions, questions, docIndex } = d;

  // Filtered data
  const filteredSummary = monthFilter === "all" ? aggregate : (() => {
    const s = summaries.find(s => s.month === monthFilter);
    if (!s) return { total: 0, uniqueSessions: 0, byTheme: {}, byMode: {}, byLanguage: {} };
    return { ...s, uniqueSessions: (s.sessions||[]).length };
  })();

  const filteredQs = monthFilter === "all" ? recentQuestions :
    (summaries.find(s => s.month === monthFilter)?.recentQuestions || []);

  const themeData = Object.entries(filteredSummary.byTheme||{}).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
  const trendData = [...summaries].reverse().map(s => ({ month: s.month, questions: s.total, users: (s.sessions||[]).length }));

  const card = { background: B.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${B.border}`, boxShadow: "0 2px 8px rgba(25,36,55,0.08)" };
  const cardTitle = { fontWeight: 700, fontSize: 11, color: B.navy, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" };
  const tabs = [
    { id: "analytics", label: "📊 Analytics" },
    { id: "log", label: "📋 Question Log" },
    { id: "questions", label: "✏️ Edit Questions" },
    { id: "documents", label: "📄 Documents" },
  ];

  return <div style={{ minHeight: "100dvh", background: B.bgPage, fontFamily: "Inter,sans-serif" }}>
    {/* Header */}
    <div style={{ background: B.grad, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ color: B.white, fontWeight: 900, fontSize: 16 }}>KE&G ESOP Admin</div>
        <div style={{ color: B.gray, fontSize: 11, marginTop: 2 }}>Analytics · Logs · Questions · Documents</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={refresh} disabled={refreshing} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: B.white, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
          {refreshing ? "..." : "↻ Refresh"}
        </button>
        <button onClick={onLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: B.gray, fontSize: 12, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>Sign Out</button>
      </div>
    </div>

    {/* Tab bar */}
    <div style={{ background: B.bgCard, borderBottom: `1px solid ${B.border}`, padding: "0 28px", display: "flex", gap: 4 }}>
      {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "13px 18px", fontSize: 13, fontWeight: tab===t.id ? 700 : 500, color: tab===t.id ? B.orange : B.mid, background: "transparent", border: "none", borderBottom: tab===t.id ? `2px solid ${B.orange}` : "2px solid transparent", cursor: "pointer", fontFamily: "Inter,sans-serif", marginBottom: -1 }}>{t.label}</button>)}
    </div>

    <div style={{ padding: "24px 28px", maxWidth: 1200 }}>

      {/* ── ANALYTICS ── */}
      {tab === "analytics" && <div>
        {/* Month filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: B.mid, textTransform: "uppercase", letterSpacing: "0.06em" }}>Period:</span>
          {["all", ...(monthIndex||[])].map(m => (
            <button key={m} onClick={() => setMonthFilter(m)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${monthFilter===m ? B.orange : B.border}`, background: monthFilter===m ? B.orange : B.bgCard, color: monthFilter===m ? B.white : B.mid, fontFamily: "Inter,sans-serif" }}>
              {m === "all" ? "All Time" : m}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Questions", value: filteredSummary.total || 0, sub: monthFilter==="all" ? "all time" : monthFilter },
            { label: "Unique Users", value: filteredSummary.uniqueSessions || 0, sub: "by session" },
            { label: "Employee Mode", value: filteredSummary.byMode?.employee || 0, sub: `${filteredSummary.total ? Math.round((filteredSummary.byMode?.employee||0)/filteredSummary.total*100) : 0}%` },
            { label: "Spanish", value: filteredSummary.byLanguage?.es || 0, sub: `${filteredSummary.total ? Math.round((filteredSummary.byLanguage?.es||0)/filteredSummary.total*100) : 0}%` },
          ].map(s => <div key={s.label} style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: B.navy, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: B.muted, marginTop: 4 }}>{s.sub}</div>
          </div>)}
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={card}>
            <div style={cardTitle}>Monthly Trend — Questions &amp; Users</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.border}/>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: B.muted }}/>
                  <YAxis tick={{ fontSize: 10, fill: B.muted }} width={32}/>
                  <Tooltip/>
                  <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>}/>
                  <Bar dataKey="questions" fill={B.orange} radius={[4,4,0,0]} name="Questions"/>
                  <Bar dataKey="users" fill={B.blue} radius={[4,4,0,0]} name="Users"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={card}>
            <div style={cardTitle}>Questions by Theme</div>
            {themeData.length > 0 ? <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={themeData} dataKey="value" cx="40%" cy="50%" outerRadius={85} label={false}>
                    {themeData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" formatter={v => <span style={{ fontSize: 10, color: B.mid }}>{v}</span>}/>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: B.muted, fontSize: 13 }}>No data yet — ask some questions to populate this chart.</div>}
          </div>
        </div>

        {/* Theme bars */}
        <div style={card}>
          <div style={cardTitle}>Theme Breakdown</div>
          {themeData.length === 0 ? <div style={{ color: B.muted, fontSize: 13 }}>No data yet.</div> :
            themeData.map((t,i) => <div key={t.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: B.mid, fontWeight: 500 }}>{t.name}</span>
                <span style={{ color: B.navy, fontWeight: 700 }}>{t.value}</span>
              </div>
              <div style={{ height: 7, background: B.bgPage, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(t.value/(themeData[0]?.value||1))*100}%`, background: PIE_COLORS[i%PIE_COLORS.length], borderRadius: 4, transition: "width 0.5s" }}/>
              </div>
            </div>)}
        </div>
      </div>}

      {/* ── LOG TAB ── */}
      {tab === "log" && <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={cardTitle}>Question Log ({filteredQs.length} entries)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {["all", ...(monthIndex||[])].map(m => <button key={m} onClick={() => setMonthFilter(m)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${monthFilter===m ? B.orange : B.border}`, background: monthFilter===m ? B.orange : B.bgCard, color: monthFilter===m ? B.white : B.mid, fontFamily: "Inter,sans-serif" }}>{m==="all" ? "All" : m}</button>)}
            <button onClick={() => {
              const rows = filteredQs.slice(0, 200);
              const header = "Timestamp,Mode,Language,Theme,Question";
              const csv = [header, ...rows.map(r => [
                r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
                r.mode || "",
                r.language || "",
                r.theme || "",
                `"${(r.question || "").replace(/"/g, '""')}"`,
              ].join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `esop-questions-${monthFilter}.csv`;
              a.click();
            }} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${B.border}`, background: B.bgCard, color: B.mid, fontFamily: "Inter,sans-serif" }}>⬇ Export CSV</button>
          </div>
        </div>
        {filteredQs.length === 0 ? <div style={{ color: B.muted, fontSize: 13, padding: "20px 0" }}>No questions logged yet.</div> :
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: B.bgPage }}>
                  {["Timestamp","Mode","Lang","Theme","Question"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, borderBottom: `1px solid ${B.border}`, whiteSpace: "nowrap" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredQs.slice(0,200).map((r,i) => <tr key={i} style={{ borderBottom: `1px solid ${B.border}` }}>
                  <td style={{ padding: "8px 12px", color: B.muted, whiteSpace: "nowrap" }}>{r.timestamp ? new Date(r.timestamp).toLocaleString() : ""}</td>
                  <td style={{ padding: "8px 12px", color: B.mid }}>{r.mode}</td>
                  <td style={{ padding: "8px 12px", color: B.mid }}>{r.language}</td>
                  <td style={{ padding: "8px 12px" }}><span style={{ background: B.bgPage, color: B.mid, padding: "2px 8px", borderRadius: 10, fontSize: 11, whiteSpace: "nowrap" }}>{r.theme}</span></td>
                  <td style={{ padding: "8px 12px", color: B.black }}>{r.question}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </div>}

      {/* ── QUESTIONS TAB ── */}
      {tab === "questions" && <QuestionsTab questions={questions} password={password} onSaved={q => setD(d => ({...d, questions: q}))}/>}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "documents" && <DocumentsTab password={password} docIndex={docIndex||{docs:[]}} onRefresh={refresh}/>}
    </div>
  </div>;
}

function Admin() {
  const [adminData, setAdminData] = useState(null);
  const [password, setPassword] = useState("");
  if (!adminData) return <AdminLogin onLogin={(pw, data) => { setPassword(pw); setAdminData(data); }}/>;
  return <AdminDashboard data={adminData} password={password} onLogout={() => { setAdminData(null); setPassword(""); }}/>;
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  if (window.location.pathname === "/admin") return <Admin/>;

  const [mode, setMode] = useState(null);
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [customQuestions, setCustomQuestions] = useState(null);
  const bottomRef = useRef(null);
  const calcRef = useRef(null);
  const inputRef = useRef(null);
  const history = useRef([]);
  const t = T[lang];

  // Load custom questions from backend on mount
  useEffect(() => {
    fetch("/.netlify/functions/admin-data", { headers: { "Authorization": "Bearer __public__" } })
      .then(r => r.json())
      .then(d => { if (d.questions) setCustomQuestions(d.questions); })
      .catch(() => {});
  }, []);

  const questions = customQuestions || DEFAULT_QUESTIONS;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (showCalc && calcRef.current) setTimeout(() => calcRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50); }, [showCalc]);

  const startMode = (m) => { setMode(m); history.current = []; setMessages([{ role: "assistant", content: WELCOME[lang][m] }]); setShowCalc(false); };

  const detectTheme = (q) => {
    const t = q.toLowerCase();
    if (/vest|vesting|vested|cliff/.test(t)) return "Vesting";
    if (/distribut|cash out|collect|payout|receive|retire|retirement/.test(t)) return "Distributions";
    if (/worth|value|price|share price|stock price|how much|account balance|balance/.test(t)) return "Account Value";
    if (/leave|leaving|quit|fired|terminate|termination|resign|resignation|layoff/.test(t)) return "Leaving";
    if (/enroll|join|eligible|eligibility|start|participate|sign up/.test(t)) return "Enrollment";
    if (/blue diamond|bdl|holding|structure|parent/.test(t)) return "Company Structure";
    if (/tax|taxes|taxed|ira|rollover|401k/.test(t)) return "Tax & Rollover";
    if (/work|project|build|construction|service|do you|keg do/.test(t)) return "About KE&G";
    if (/how.*work|what is|explain|overview|esop/.test(t)) return "How It Works";
    return "Other";
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

    // Log question with theme detection
    fetch("/.netlify/functions/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: userText, mode, language: lang, sessionId: SESSION_ID, theme: detectTheme(userText) }),
    }).catch(() => {});

    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM[lang][mode], messages: history.current }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Something went wrong. Try again.";
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

  if (!mode) return <div style={{ fontFamily: "'Inter',sans-serif", background: B.bgPage, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
    <style>{css}</style>
    <div style={{ background: B.grad, padding: "22px 32px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="48" height="32" viewBox="0 0 120 80" fill="none"><polygon points="60,4 116,40 60,76 4,40" stroke="white" strokeWidth="5" fill="none"/><text x="60" y="50" textAnchor="middle" fill="white" fontSize="26" fontWeight="900" fontFamily="Inter,sans-serif">KE&amp;G</text></svg>
          <div><div style={{ color: B.white, fontWeight: 900, fontSize: 17 }}>KE&G CONSTRUCTION</div><div style={{ color: B.gray, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>100% Employee Owned</div></div>
        </div>
        <button onClick={() => setLang(l => l==="en" ? "es" : "en")} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: B.white, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
          {lang==="en" ? t.spanish : t.english}
        </button>
      </div>
      <div style={{ fontFamily: "'Mr Dafoe',cursive", fontSize: 40, color: B.orange, lineHeight: 1.1, marginBottom: 8 }}>{t.tagline}</div>
      <div style={{ color: "#c8d0dc", fontSize: 14 }}>{lang==="en" ? "Plain-language answers about your employee ownership — plus a calculator to see what it could be worth." : "Respuestas en español sencillo sobre tu propiedad de empleado — más una calculadora para ver cuánto podría valer."}</div>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: B.navy, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, textAlign: "center" }}>{t.whoAreYou}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[{key:"employee",label:t.employeeLabel,sub:t.employeeSub},{key:"prospect",label:t.prospectLabel,sub:t.prospectSub}].map(opt => (
            <button key={opt.key} onClick={() => startMode(opt.key)}
              style={{ background: B.bgCard, border: `2px solid ${B.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 13, fontFamily: "'Inter',sans-serif", transition: "all 0.18s", width: "100%" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=B.orange; e.currentTarget.style.boxShadow="0 0 0 3px rgba(244,121,44,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=B.border; e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: B.orange, flexShrink: 0, marginTop: 6 }}/>
              <div><div style={{ fontWeight: 700, fontSize: 14, color: B.navy, marginBottom: 4 }}>{opt.label}</div><div style={{ fontSize: 13, color: B.muted, lineHeight: 1.55 }}>{opt.sub}</div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
    <div style={{ background: B.grad, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <svg width="26" height="17" viewBox="0 0 120 80" fill="none"><polygon points="60,4 116,40 60,76 4,40" stroke="white" strokeWidth="6" fill="none"/><text x="60" y="50" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="Inter,sans-serif">KE&amp;G</text></svg>
      <span style={{ color: "#8a9ab4", fontSize: 11 }}>{t.footer}</span>
    </div>
  </div>;

  return <div style={{ fontFamily: "'Inter',sans-serif", background: B.bgPage, height: "100dvh", display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto" }}>
    <style>{css}</style>
    <div style={{ background: B.grad, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: B.white, flexShrink: 0 }}>K</div>
        <div><div style={{ color: B.white, fontWeight: 700, fontSize: 14 }}>{t.title}</div><div style={{ color: B.gray, fontSize: 11 }}>{mode==="employee" ? t.employeeMode : t.prospectMode}</div></div>
      </div>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <button onClick={() => setLang(l => l==="en" ? "es" : "en")} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: B.gray, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          {lang==="en" ? t.spanish : t.english}
        </button>
        <button onClick={() => setShowCalc(v => !v)} style={{ background: showCalc ? B.orange : "transparent", border: `1.5px solid ${showCalc ? B.orange : "rgba(255,255,255,0.3)"}`, color: showCalc ? B.white : B.gray, fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s" }}>
          {showCalc ? t.closeCalc : t.openCalc}
        </button>
        <button onClick={() => { setMode(null); setMessages([]); setShowCalc(false); history.current=[]; }} style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", color: B.gray, fontSize: 11, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          {t.switchMode}
        </button>
      </div>
    </div>

    <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px" }}>
      {messages.map((msg,i) => <Bubble key={i} msg={msg}/>)}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} lang={lang} calcRef={calcRef}/>}
      {loading && <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 9, fontSize: 11, fontWeight: 900, color: B.white }}>K</div>
        <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: "16px 16px 16px 4px" }}><TypingDots/></div>
      </div>}
      <div ref={bottomRef}/>
    </div>

    {messages.length <= 1 && <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
      <div style={{ fontSize: 10, color: B.muted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, fontWeight: 700 }}>{t.commonQ}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(questions[lang]?.[mode]||DEFAULT_QUESTIONS[lang][mode]).map((q,i) => (
          <button key={i} onClick={() => sendMessage(q)}
            style={{ background: B.bgCard, border: `1.5px solid ${B.border}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, color: B.mid, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 500, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=B.orange; e.currentTarget.style.color=B.orange; e.currentTarget.style.background="#FFF4EE"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=B.border; e.currentTarget.style.color=B.mid; e.currentTarget.style.background=B.bgCard; }}>
            {q}
          </button>
        ))}
      </div>
    </div>}

    <div style={{ padding: "10px 16px 14px", background: B.grad, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-end", background: B.bgCard, border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 11, padding: "9px 11px", transition: "border-color 0.15s" }}
        onFocusCapture={e => e.currentTarget.style.borderColor=B.orange}
        onBlurCapture={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"}>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={t.placeholder} rows={1}
          style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: 14, fontFamily: "'Inter',sans-serif", color: B.black, lineHeight: 1.5, maxHeight: 90, overflowY: "auto" }}/>
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          style={{ width: 32, height: 32, borderRadius: "50%", background: input.trim() && !loading ? B.orange : B.border, border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <p style={{ fontSize: 10, color: "#7a8aa0", textAlign: "center", margin: "7px 0 0" }}>{t.disclaimer}</p>
    </div>
  </div>;
}
