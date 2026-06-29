import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── KE&G Brand tokens (official brand guide) ──────────────────────
const B = {
  orange:  "#F4792C",
  navy:    "#192437",
  blue:    "#253B80",
  gray:    "#BDBEC1",
  white:   "#FFFFFF",
  black:   "#020304",
  bgPage:  "#F4F5F7",
  bgCard:  "#FFFFFF",
  border:  "#DDE0E8",
  muted:   "#6B7080",
  mid:     "#3A3D4A",
  grad:    "linear-gradient(90deg, #192437 0%, #253B80 100%)",
};

// ── API endpoint — edge function ──────────────────────────────────
const API_URL = "/api/chat";

// ── System prompts ────────────────────────────────────────────────
const SYSTEM = {
  employee: `You are the KE&G Construction ESOP Knowledge Assistant. Answer in plain language like you're talking to someone on a job site — short sentences, no jargon.

KE&G Construction is 100% employee-owned, founded 1972, Tucson/Sierra Vista AZ. Plan name: Blue Diamond Legacy Holdings, Inc. ESOP. BDL is the holding company that owns KE&G — that's why employees see BDL on paperwork. KE&G Construction, Inc. is a participating employer.

KEY FACTS (from official SPD, Jan 1 2024):

ELIGIBILITY & CONTRIBUTIONS:
- Eligible after 1,000 hrs/year. You officially join Jan 1 of that year.
- Company funds it entirely. You put in zero dollars.
- Your share = your pay divided by all eligible employee pay combined.
- Account valued every Dec 31 by an independent appraiser. Annual statement sent to you.

VESTING (how long until it's yours to keep):
- Under 2 years: 0%
- 2 years: 20%
- 3 years: 40%
- 4 years: 60%
- 5 years: 80%
- 6+ years: 100% — fully yours
- Automatic 100% vesting if you reach age 65 while still employed, or if you die or become permanently disabled on the job.
- If you leave before fully vested: you keep only your vested percentage. The rest is forfeited after a 5-year break in service.

WHEN YOU GET PAID — THIS IS IMPORTANT, GET IT RIGHT:

Scenario A — Retirement (age 65+), Disability, or Death:
- You (or your beneficiary) receive the FIRST distribution in the calendar year AFTER you leave.
- Example: Leave/retire in 2025 → first payout in 2026.

Scenario B — All other terminations (quit, laid off, fired — any reason other than retirement/disability/death):
- There is a mandatory 5-year waiting period before distributions begin.
- Distributions start in the 6TH year after you leave.
- Example: Leave in 2025 → 5-year wait → distributions start 2031, first check arrives 2032.
- Exception: If your vested balance is $1,000 or less, you get an automatic lump sum right away.
- If your balance is between $1,001 and $7,000, you can elect a lump sum without waiting.

HOW IT'S PAID:
- Always paid in cash — not company stock (KE&G is an S-corp).
- Default payout method: annual installments over 5 years.

DIVERSIFICATION (for long-tenured employees):
- If you are age 55 OR OLDER AND have completed 10 or more years of active plan participation, you qualify to diversify.
- Diversification means you can move a portion of your ESOP shares out of company stock and into other investments — reduces risk as you approach retirement.
- You can diversify up to 25% of your eligible shares per year for the first 5 years of eligibility.
- In year 6, you can diversify up to 50%.
- After that 6-year window closes, the option is gone — use it or lose it.
- You are never required to diversify — it's your choice.

TAXES:
- No taxes while your account grows. You pay taxes when you take a distribution.
- 20% federal withholding applies automatically unless you roll to an IRA or qualified plan.
- Distributions before age 59.5 may also trigger a 10% early withdrawal penalty.
- Always recommend they talk to a tax advisor before taking a distribution.

CALCULATOR: When someone asks what their ESOP could be worth, about projections, or retirement numbers — tell them to open the Wealth Calculator (button at the top of this screen).

TONE: Short sentences. Plain English. "Vested" = "yours to keep". "Distribution" = "when you collect your money". Never use legal language. Direct personal account questions (balance, exact dates) to HR.`,

  prospect: `You are the KE&G Construction ESOP Chat Assistant for job seekers. Direct, honest, no recruiting fluff.

KE&G is 100% employee-owned, founded 1972, Tucson/Sierra Vista AZ. 500+ employee-owners. "Constructing Legacies."

ESOP: company-funded retirement benefit. You pay nothing. KE&G puts stock in your name each year based on your pay. Stock grows as company does. You collect in cash when you leave or retire.

VESTING (how long until the shares are yours to keep):
- Under 2 years: 0%
- 2 years: 20%
- 3 years: 40%
- 4 years: 60%
- 5 years: 80%
- 6+ years: 100% — fully yours
- Eligible after working 1,000 hours in a year

PAYOUT BASICS:
- Retire at 65+: first payout the year after you leave.
- Leave for any other reason: there is a waiting period before distributions begin. The longer you stay and the more vested you are, the more you walk away with.
- All distributions paid in cash.

DIVERSIFICATION: After age 55 with 10+ years in the plan, employees can start moving some of their shares into other investments — a way to reduce risk as retirement approaches.

Only about 1 in 200 US companies is fully employee-owned. When KE&G wins, your retirement grows.
Work: roads, utilities, water systems, drainage, bridges, heavy civil, mine site work, JOC contracts.
Service area: Pima, Santa Cruz, Cochise, Graham, Greenlee counties AZ; Otero County NM.
Values: Safety, Integrity, Development, Excellence. Apply: kegtus.com

CALCULATOR: If asked what ESOP could be worth, mention the calculator button at the top of the screen.
Do NOT mention Blue Diamond Legacy Holdings.
TONE: Short sentences, plain English, no buzzwords.`
};

const SUGGESTED = {
  employee: ["How does the ESOP work?", "When do I start getting vested?", "What if I leave before I'm vested?", "What could my ESOP be worth?", "What is Blue Diamond Legacy Holdings?", "When can I collect my money?"],
  prospect: ["What does employee ownership mean for me?", "Do I pay anything to get stock?", "How long until it's mine to keep?", "What could my ESOP be worth?", "What kind of work does KE&G do?"]
};

const WELCOME = {
  employee: "Hey — I'm here to answer your ESOP questions in plain English. Ask me anything about vesting, your account, when you can collect, or what Blue Diamond Legacy Holdings means. Open the calculator anytime to see what your ownership could be worth.",
  prospect: "Hey — I can answer questions about what it means to work at a 100% employee-owned company. Short version: KE&G puts stock in your name every year, at no cost to you. Ask me anything — or open the calculator to see what that could add up to."
};

const CALC_RE = /how much|worth|retire|calculat|estimate|project|grow|\$|payout|earn|salary|hourly|account|balance|what.*get/i;

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

function Calculator({ onClose }) {
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
    <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 12, marginBottom: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(25,36,55,0.15)" }}>
      <div style={{ background: B.grad, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: B.white, fontWeight: 700, fontSize: 13, fontFamily: "Inter, sans-serif" }}>ESOP Wealth Calculator</div>
          <div style={{ color: B.gray, fontSize: 11, fontFamily: "Inter, sans-serif", marginTop: 1 }}>See what your ownership could be worth at retirement</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: B.gray, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div style={{ padding: "16px", display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 185px", minWidth: 170 }}>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>Pay type</span>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1.5px solid ${B.border}` }}>
              {["hourly", "salary"].map(t => (
                <button key={t} onClick={() => setPayType(t)} style={{ flex: 1, padding: "7px 0", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", border: "none", fontFamily: "Inter, sans-serif", background: payType === t ? B.orange : B.bgPage, color: payType === t ? B.white : B.mid, transition: "all 0.15s" }}>
                  {t === "hourly" ? "Hourly" : "Salaried"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>{payType === "hourly" ? "Hourly wage" : "Annual salary"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: B.muted, fontSize: 13, fontFamily: "Inter, sans-serif" }}>$</span>
              {payType === "hourly"
                ? <input type="number" value={hourly} onChange={e => setHourly(+e.target.value || 0)} style={inp} />
                : <input type="number" value={salary} onChange={e => setSalary(+e.target.value || 0)} style={inp} />}
              {payType === "hourly" && <span style={{ fontSize: 10, color: B.muted, fontFamily: "Inter, sans-serif" }}>/hr</span>}
            </div>
            {payType === "hourly" && <div style={{ fontSize: 10, color: B.muted, marginTop: 3, fontFamily: "Inter, sans-serif" }}>≈ {fmt(hourly * 2080)}/year</div>}
          </div>
          <div style={{ marginBottom: 13 }}>
            <span style={lbl}>Current ESOP balance</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: B.muted, fontSize: 13, fontFamily: "Inter, sans-serif" }}>$</span>
              <input type="number" value={balance} onChange={e => setBalance(+e.target.value || 0)} style={inp} placeholder="0" />
            </div>
            <div style={{ fontSize: 10, color: B.muted, marginTop: 3, fontFamily: "Inter, sans-serif" }}>From your last annual statement</div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={lbl}>Years until retirement</span>
              <span style={badge}>{years}</span>
            </div>
            <input type="range" min={1} max={40} value={years} step={1} onChange={e => setYears(+e.target.value)} style={{ width: "100%", accentColor: B.orange, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: B.muted, marginTop: 2, fontFamily: "Inter, sans-serif" }}><span>1</span><span>40 yrs</span></div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={lbl}>Annual benefit level</span>
              <span style={badge}>{benefit}%</span>
            </div>
            <input type="range" min={1} max={25} value={benefit} step={1} onChange={e => setBenefit(+e.target.value)} style={{ width: "100%", accentColor: B.orange, cursor: "pointer" }} />
            <div style={{ fontSize: 10, color: B.muted, marginTop: 5, lineHeight: 1.5, fontFamily: "Inter, sans-serif" }}>KE&G's historical average is ~8%. Ask HR for your current rate.</div>
          </div>
        </div>
        <div style={{ flex: "2 1 240px", minWidth: 220 }}>
          <div style={{ background: B.grad, borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: B.gray, marginBottom: 4, fontFamily: "Inter, sans-serif" }}>Estimated value by {retYear}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: B.orange, lineHeight: 1, fontFamily: "Inter, sans-serif" }}>{fmt(total)}</div>
            <div style={{ fontSize: 11, color: "#9aaec4", marginTop: 6, fontFamily: "Inter, sans-serif" }}>≈ {fmt(perYr)}/year — at no cost out of your paycheck</div>
          </div>
          <div style={{ height: 168 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.orange} stopOpacity={0.85} /><stop offset="95%" stopColor={B.orange} stopOpacity={0.35} /></linearGradient>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.blue} stopOpacity={0.55} /><stop offset="95%" stopColor={B.blue} stopOpacity={0.15} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={B.border} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: B.muted, fontFamily: "Inter, sans-serif" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: B.muted, fontFamily: "Inter, sans-serif" }} tickLine={false} width={44} tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="allocations" stackId="1" stroke={B.orange} fill="url(#gA)" strokeWidth={2} />
                <Area type="monotone" dataKey="priceGrowth" stackId="1" stroke={B.blue} fill="url(#gG)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center" }}>
            {[{ c: B.orange, l: "Annual allocations" }, { c: B.blue, l: "Share price growth" }].map(x => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: B.muted, fontFamily: "Inter, sans-serif" }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }} />{x.l}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: B.muted, marginTop: 10, lineHeight: 1.5, fontFamily: "Inter, sans-serif" }}>Estimate only. Assumes ~5% annual share price growth. Not financial advice — contact HR for specifics.</div>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "12px 16px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: B.orange, animation: `kBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 9, marginTop: 2, fontSize: 11, fontWeight: 900, color: B.white, fontFamily: "Inter, sans-serif" }}>K</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "10px 14px", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
        fontFamily: "Inter, sans-serif",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? B.orange : B.bgCard,
        color: isUser ? B.white : B.black,
        boxShadow: isUser ? "none" : "0 1px 6px rgba(25,36,55,0.09)",
        border: isUser ? "none" : `1px solid ${B.border}`,
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const history = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, showCalc]);

  const startMode = (m) => {
    setMode(m); history.current = [];
    setMessages([{ role: "assistant", content: WELCOME[m] }]);
    setShowCalc(false);
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    if (CALC_RE.test(userText)) setShowCalc(true);
    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    history.current.push({ role: "user", content: userText });
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM[mode], messages: history.current }),
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
  `;

  if (!mode) return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: B.bgPage, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>
      <div style={{ background: B.grad, padding: "22px 32px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <svg width="48" height="32" viewBox="0 0 120 80" fill="none">
            <polygon points="60,4 116,40 60,76 4,40" stroke="white" strokeWidth="5" fill="none"/>
            <text x="60" y="50" textAnchor="middle" fill="white" fontSize="26" fontWeight="900" fontFamily="Inter,sans-serif">KE&amp;G</text>
          </svg>
          <div>
            <div style={{ color: B.white, fontWeight: 900, fontSize: 17, fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>KE&G CONSTRUCTION</div>
            <div style={{ color: B.gray, fontSize: 11, fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>100% Employee Owned</div>
          </div>
        </div>
        <div style={{ fontFamily: "'Mr Dafoe', cursive", fontSize: 40, color: B.orange, lineHeight: 1.1, marginBottom: 8 }}>
          Constructing Legacies.
        </div>
        <div style={{ color: "#c8d0dc", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
          Plain-language answers about your employee ownership — plus a calculator to see what it could be worth.
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 500 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: B.navy, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter, sans-serif", marginBottom: 16, textAlign: "center" }}>Who are you?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: "employee", label: "I'm a KE&G employee-owner", sub: "Ask about vesting, your account, payouts, BDL, and what ownership really means for your retirement." },
              { key: "prospect", label: "I'm exploring a career at KE&G", sub: "Learn what employee ownership means in practice — and why it makes KE&G different from most employers." }
            ].map(opt => (
              <button key={opt.key} onClick={() => startMode(opt.key)}
                style={{ background: B.bgCard, border: `2px solid ${B.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 13, fontFamily: "'Inter', sans-serif", transition: "all 0.18s", width: "100%" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = B.orange; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(244,121,44,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: B.orange, flexShrink: 0, marginTop: 6 }} />
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
        <span style={{ color: "#8a9ab4", fontSize: 11, fontFamily: "Inter, sans-serif" }}>Employee-Owned Since 2014 · Constructing Legacies.</span>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: B.bgPage, height: "100dvh", display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto" }}>
      <style>{css}</style>
      <div style={{ background: B.grad, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: B.white, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>K</div>
          <div>
            <div style={{ color: B.white, fontWeight: 700, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>ESOP Ownership Assistant</div>
            <div style={{ color: B.gray, fontSize: 11, fontFamily: "'Inter', sans-serif" }}>{mode === "employee" ? "Employee-Owner Mode" : "Prospective Hire Mode"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCalc(v => !v)} style={{ background: showCalc ? B.orange : "transparent", border: `1.5px solid ${showCalc ? B.orange : "rgba(255,255,255,0.3)"}`, color: showCalc ? B.white : B.gray, fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}>
            {showCalc ? "✕ Close Calc" : "Open Calculator"}
          </button>
          <button onClick={() => { setMode(null); setMessages([]); setShowCalc(false); history.current = []; }}
            style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", color: B.gray, fontSize: 11, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Switch Mode
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px" }}>
        {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 9, fontSize: 11, fontWeight: 900, color: B.white, fontFamily: "'Inter', sans-serif" }}>K</div>
            <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: "16px 16px 16px 4px" }}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && (
        <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: B.muted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Common questions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTED[mode].map((q, i) => (
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
            placeholder="Ask about the ESOP…" rows={1}
            style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: 14, fontFamily: "'Inter', sans-serif", color: B.black, lineHeight: 1.5, maxHeight: 90, overflowY: "auto" }} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 32, height: 32, borderRadius: "50%", background: input.trim() && !loading ? B.orange : B.border, border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" /><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: "#7a8aa0", textAlign: "center", margin: "7px 0 0", fontFamily: "'Inter', sans-serif" }}>
          Estimates only — for account specifics, contact HR directly. · KE&G Construction
        </p>
      </div>
    </div>
  );
}
