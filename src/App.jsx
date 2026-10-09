import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

// ── Brand colors ──────────────────────────────────────────────
const C = {
  navy: '#192437',
  blue: '#253B80',
  orange: '#F4792C',
  gray: '#BDBEC1',
  black: '#020304',
  white: '#FFFFFF',
  lightBg: '#F5F4F0',
}

const headerGrad = `linear-gradient(90deg, ${C.navy} 0%, ${C.blue} 100%)`

// ── Suggested questions ───────────────────────────────────────
const DEFAULT_QUESTIONS = {
  en: {
    employee: [
      'When can I collect my money?',
      'What if I leave before I\'m vested?',
      'How does my account grow?',
      'What is Blue Diamond Legacy Holdings?',
    ],
    prospect: [
      'What does 100% employee-owned mean for me?',
      'How does the ESOP work as a benefit?',
      'When do I become an owner?',
      'How much could my ownership be worth?',
    ],
  },
  es: {
    employee: [
      '¿Cuándo puedo cobrar mi dinero?',
      '¿Qué pasa si me voy antes de estar habilitado?',
      '¿Cómo crece mi cuenta?',
      '¿Qué es Blue Diamond Legacy Holdings?',
    ],
    prospect: [
      '¿Qué significa ser 100% dueño empleado para mí?',
      '¿Cómo funciona el ESOP como beneficio?',
      '¿Cuándo me convierto en propietario?',
      '¿Cuánto podría valer mi participación?',
    ],
  },
}

// ── Theme classifier ──────────────────────────────────────────
function classifyTheme(text) {
  const t = text.toLowerCase()
  if (t.match(/personal|my account|my balance|my specific|confidential/)) return 'Confidential/Personal'
  if (t.match(/vest|vesting|years of service/)) return 'Vesting'
  if (t.match(/retire|retirement|age 65|65/)) return 'Retirement & Payouts'
  if (t.match(/tax|taxes|distribution|1099|rollover/)) return 'Taxes & Distributions'
  if (t.match(/blue diamond|bdl|holding/)) return 'BDL/Structure'
  if (t.match(/diversif/)) return 'Diversification'
  if (t.match(/rehire|return|come back|re-hire/)) return 'Rehire/Return'
  if (t.match(/job|hire|apply|salary|pay|recruit|career/)) return 'Recruiting/Job Seeker'
  if (t.match(/worth|value|calculator|grow|account|balance|money|collect|paid|payout/)) return 'Theoretical Finance'
  if (t.match(/what is esop|how does|explain|overview|basics/)) return 'General Education'
  return 'Other'
}

// ── Wealth Calculator ─────────────────────────────────────────
function WealthCalculator({ onClose }) {
  const [salary, setSalary] = useState(65000)
  const [years, setYears] = useState(10)
  const [growth, setGrowth] = useState(8)

  const data = []
  let balance = 0
  const contribution = salary * 0.08
  for (let y = 1; y <= years; y++) {
    balance = (balance + contribution) * (1 + growth / 100)
    data.push({ year: `Yr ${y}`, value: Math.round(balance) })
  }
  const vested = years >= 6 ? balance : years >= 5 ? balance * 0.8 : years >= 4 ? balance * 0.6 : years >= 3 ? balance * 0.4 : years >= 2 ? balance * 0.2 : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: headerGrad, padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 18 }}>Ownership Value Calculator</div>
            <div style={{ color: C.gray, fontSize: 12, fontStyle: 'italic', fontFamily: "'Mr Dafoe', cursive" }}>Constructing Legacies.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.white, fontSize: 22, cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Annual Salary', value: salary, set: setSalary, min: 30000, max: 200000, step: 1000, fmt: v => `$${v.toLocaleString()}` },
              { label: 'Years at KE&G', value: years, set: setYears, min: 1, max: 30, step: 1, fmt: v => `${v} years` },
              { label: 'Annual Growth Rate', value: growth, set: setGrowth, min: 3, max: 15, step: 0.5, fmt: v => `${v}%` },
            ].map(({ label, value, set, min, max, step, fmt }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{label}</span>
                  <span style={{ fontSize: 14, color: C.blue, fontWeight: 700 }}>{fmt(value)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))}
                  style={{ width: '100%', accentColor: C.orange }} />
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Est. Account Value']} />
              <Area type="monotone" dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div style={{ background: C.lightBg, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Estimated Total Value</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>${Math.round(balance).toLocaleString()}</div>
            </div>
            <div style={{ background: C.lightBg, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Your Vested Amount</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.orange }}>${Math.round(vested).toLocaleString()}</div>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#999', marginTop: 12, textAlign: 'center' }}>
            Estimates only. Actual ESOP contributions and growth vary. Contact the Benefits Administration team for your specific account details.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Admin Dashboard ───────────────────────────────────────────
function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('analytics')
  const [analytics, setAnalytics] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editQ, setEditQ] = useState(null)
  const [uploadMsg, setUploadMsg] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    fetch('/.netlify/functions/admin-data')
      .then(r => r.json())
      .then(d => {
        setAnalytics(d.analytics)
        setQuestions(d.questions || DEFAULT_QUESTIONS)
        setDocs(d.docs || [])
        setLoading(false)
      })
      .catch(() => {
        setQuestions(DEFAULT_QUESTIONS)
        setLoading(false)
      })
  }, [])

  async function saveQuestions() {
    setSaveMsg('Saving...')
    try {
      const r = await fetch('/.netlify/functions/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveQuestions', questions }),
      })
      const d = await r.json()
      setSaveMsg(d.success ? 'Saved!' : 'Error saving')
    } catch { setSaveMsg('Error saving') }
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function uploadDoc(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadMsg('Uploading...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const r = await fetch('/.netlify/functions/upload-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, content: ev.target.result, type: file.type }),
        })
        const d = await r.json()
        if (d.success) {
          setDocs(d.docs)
          setUploadMsg('Uploaded!')
        } else {
          setUploadMsg(d.error || 'Upload failed')
        }
      } catch { setUploadMsg('Upload failed') }
      setTimeout(() => setUploadMsg(''), 3000)
    }
    reader.readAsText(file)
  }

  async function deleteDoc(name) {
    const r = await fetch('/.netlify/functions/upload-doc', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const d = await r.json()
    if (d.success) setDocs(d.docs)
  }

  const THEME_COLORS = ['#253B80','#F4792C','#192437','#5B7FD4','#E8A87C','#8BA3D4','#C4742C','#3D5A9E','#FAC898','#6B8EC4','#A0522D']

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: C.navy }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: C.lightBg }}>
      <div style={{ background: headerGrad, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: C.white, fontWeight: 700, fontSize: 18 }}>ESOP Chat Admin</div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: C.white, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Log Out</button>
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: `3px solid ${C.blue}`, background: C.white }}>
        {['analytics','questions','documents'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '12px 24px', border: 'none', background: tab === t ? C.blue : 'transparent', color: tab === t ? C.white : C.navy, fontWeight: 600, cursor: 'pointer', fontSize: 14, textTransform: 'capitalize' }}>
            {t === 'analytics' ? 'Analytics' : t === 'questions' ? 'Edit Questions' : 'Documents'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        {tab === 'analytics' && analytics && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Questions', val: analytics.total },
                { label: 'Unique Sessions', val: analytics.uniqueUsers },
                { label: 'Employee Mode %', val: `${analytics.employeePct}%` },
                { label: 'Spanish %', val: `${analytics.spanishPct}%` },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: C.white, borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.navy }}>{val ?? '—'}</div>
                </div>
              ))}
            </div>
            {analytics.monthly?.length > 0 && (
              <div style={{ background: C.white, borderRadius: 10, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 16px', color: C.navy }}>Monthly Questions</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={C.blue} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {analytics.themes?.length > 0 && (
              <div style={{ background: C.white, borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 16px', color: C.navy }}>Questions by Theme</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={analytics.themes} dataKey="count" nameKey="theme" cx="50%" cy="50%" outerRadius={80} label={({ theme, percent }) => `${theme} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {analytics.themes.map((_, i) => <Cell key={i} fill={THEME_COLORS[i % THEME_COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {(!analytics.total || analytics.total === 0) && (
              <div style={{ background: C.white, borderRadius: 10, padding: 40, textAlign: 'center', color: '#999', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                No question data yet. Analytics will appear once employees start using the chatbot.
              </div>
            )}
          </div>
        )}

        {tab === 'questions' && questions && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: C.navy }}>Suggested Questions</h2>
              <button onClick={saveQuestions} style={{ background: C.orange, color: C.white, border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                {saveMsg || 'Save Changes'}
              </button>
            </div>
            {[
              { key: 'en.employee', label: 'English — Employee Mode' },
              { key: 'en.prospect', label: 'English — Prospect Mode' },
              { key: 'es.employee', label: 'Spanish — Employee Mode' },
              { key: 'es.prospect', label: 'Spanish — Prospect Mode' },
            ].map(({ key, label }) => {
              const [lang, mode] = key.split('.')
              const qs = questions[lang]?.[mode] || []
              return (
                <div key={key} style={{ background: C.white, borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ margin: '0 0 12px', color: C.navy, fontSize: 15 }}>{label}</h3>
                  {qs.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input value={q} onChange={e => {
                        const updated = [...qs]; updated[i] = e.target.value
                        setQuestions(prev => ({ ...prev, [lang]: { ...prev[lang], [mode]: updated } }))
                      }} style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
                      <button onClick={() => {
                        const updated = qs.filter((_, j) => j !== i)
                        setQuestions(prev => ({ ...prev, [lang]: { ...prev[lang], [mode]: updated } }))
                      }} style={{ background: '#fee', border: '1px solid #fcc', color: '#c00', padding: '0 12px', borderRadius: 6, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                  {qs.length < 6 && (
                    <button onClick={() => {
                      setQuestions(prev => ({ ...prev, [lang]: { ...prev[lang], [mode]: [...qs, ''] } }))
                    }} style={{ marginTop: 4, background: 'none', border: `1px dashed ${C.blue}`, color: C.blue, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Add question</button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: C.navy }}>Reference Documents</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {uploadMsg && <span style={{ fontSize: 13, color: uploadMsg.includes('fail') || uploadMsg.includes('Error') ? '#c00' : C.blue }}>{uploadMsg}</span>}
                <button onClick={() => fileRef.current.click()} style={{ background: C.orange, color: C.white, border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Upload Document</button>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.md" onChange={uploadDoc} style={{ display: 'none' }} />
              </div>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
              Upload plain text or PDF/Word files. The bot will search these for relevant answers. Max 10 documents, 50KB each.
            </p>
            {docs.length === 0 ? (
              <div style={{ background: C.white, borderRadius: 10, padding: 40, textAlign: 'center', color: '#999', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                No documents uploaded yet.
              </div>
            ) : (
              docs.map((doc, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 20px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.navy }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{doc.size ? `${(doc.size/1024).toFixed(1)} KB` : ''} · Uploaded {doc.uploaded ? new Date(doc.uploaded).toLocaleDateString() : ''}</div>
                  </div>
                  <button onClick={() => deleteDoc(doc.name)} style={{ background: '#fee', border: '1px solid #fcc', color: '#c00', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Delete</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin Login ───────────────────────────────────────────────
function AdminLogin({ onSuccess }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const r = await fetch('/.netlify/functions/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password: pw }),
      })
      const d = await r.json()
      if (d.success) onSuccess()
      else setErr('Incorrect password')
    } catch { setErr('Connection error') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: C.white, borderRadius: 12, padding: 40, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: headerGrad, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>🔒</div>
          <h2 style={{ margin: 0, color: C.navy }}>Admin Access</h2>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>ESOP Chat Dashboard</p>
        </div>
        <form onSubmit={submit}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password"
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', marginBottom: 12 }} />
          {err && <div style={{ color: '#c00', fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: C.orange, color: C.white, border: 'none', padding: 14, borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Checking...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Chat App ─────────────────────────────────────────────
export default function App() {
  const isAdmin = window.location.pathname === '/admin'

  const [adminAuthed, setAdminAuthed] = useState(false)
  const [lang, setLang] = useState('en')
  const [mode, setMode] = useState('employee')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [suggestedQs, setSuggestedQs] = useState(null)
  const bottomRef = useRef()
  const sessionId = useRef(Math.random().toString(36).slice(2))

  useEffect(() => {
    fetch('/.netlify/functions/admin-data')
      .then(r => r.json())
      .then(d => { if (d.questions) setSuggestedQs(d.questions) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const greeting = lang === 'es'
      ? (mode === 'employee'
        ? 'Hola — estoy aquí para responder tus preguntas sobre el ESOP en español sencillo. Pregúntame sobre adquisición de derechos, tu cuenta, cuándo puedes cobrar, o qué significa Blue Diamond Legacy Holdings. Abre la calculadora en cualquier momento para ver cuánto podría valer tu participación.'
        : 'Hola — Soy el Asistente de Propiedad ESOP de KE&G. Pregúntame sobre cómo funciona la propiedad, los beneficios, o cuándo te conviertes en propietario.')
      : (mode === 'employee'
        ? "Hey — I'm here to answer your ESOP questions in plain English. Ask me anything about vesting, your account, when you can collect, or what Blue Diamond Legacy Holdings means. Open the calculator anytime to see what your ownership could be worth."
        : "Hi — I'm KE&G's ESOP Ownership Assistant. Ask me how ownership works, what the benefits are, or what happens when you join.")
    setMessages([{ role: 'assistant', content: greeting }])
  }, [lang, mode])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const currentQs = (suggestedQs || DEFAULT_QUESTIONS)[lang]?.[mode] || []

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    const calcTriggers = ['worth', 'value', 'calculator', 'how much', 'estimate', 'cuánto', 'valor', 'calculadora']
    if (calcTriggers.some(t => msg.toLowerCase().includes(t))) {
      setTimeout(() => setShowCalc(true), 800)
    }

    try {
      const r = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, language: lang, mode, history: messages.slice(-6) }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      setMessages(prev => [...prev, { role: 'assistant', content: d.response }])

      fetch('/.netlify/functions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg, mode, language: lang, sessionId: sessionId.current, theme: classifyTheme(msg) }),
      }).catch(() => {})
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'es' ? 'Error de conexión — por favor intenta de nuevo.' : 'Connection error — please try again.' }])
    }
    setLoading(false)
  }

  if (isAdmin) {
    if (!adminAuthed) return <AdminLogin onSuccess={() => setAdminAuthed(true)} />
    return <AdminDashboard onLogout={() => setAdminAuthed(false)} />
  }

  return (
    <div style={{ minHeight: '100vh', background: C.lightBg, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {showCalc && <WealthCalculator onClose={() => setShowCalc(false)} />}

      {/* Header */}
      <div style={{ background: headerGrad, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 17 }}>
            {lang === 'es' ? 'Asistente de Propiedad ESOP' : 'ESOP Ownership Assistant'}
          </div>
          <div style={{ color: C.gray, fontSize: 12 }}>
            {mode === 'employee'
              ? (lang === 'es' ? 'Modo Empleado-Propietario' : 'Employee-Owner Mode')
              : (lang === 'es' ? 'Modo Candidato' : 'Prospective Hire Mode')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: C.white, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {lang === 'en' ? 'Español' : 'English'}
          </button>
          <button onClick={() => setShowCalc(true)}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: C.white, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {lang === 'es' ? 'Calculadora' : 'Open Calculator'}
          </button>
          <button onClick={() => setMode(m => m === 'employee' ? 'prospect' : 'employee')}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: C.white, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {lang === 'es' ? 'Cambiar Modo' : 'Switch Mode'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12, alignItems: 'flex-end', gap: 8 }}>
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>K</div>
            )}
            <div style={{
              maxWidth: '78%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? C.orange : C.white,
              color: m.role === 'user' ? C.white : C.black,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 15, lineHeight: 1.6,
            }}>
              {m.role === 'assistant' ? (
                <ReactMarkdown components={{
                  p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ color: C.navy }}>{children}</strong>,
                  a: ({ children }) => <span style={{ color: C.blue, textDecoration: 'underline', cursor: 'pointer' }}>{children}</span>,
                }}>{m.content}</ReactMarkdown>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 700, fontSize: 13 }}>K</div>
            <div style={{ background: C.white, padding: '12px 16px', borderRadius: '18px 18px 18px 4px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <span style={{ color: '#999', fontSize: 14 }}>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && currentQs.length > 0 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {currentQs.map((q, i) => (
            <button key={i} onClick={() => send(q)}
              style={{ background: C.white, border: `1px solid ${C.blue}`, color: C.blue, padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 16px 16px', background: C.white, borderTop: '1px solid #eee', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={lang === 'es' ? 'Pregunta sobre el ESOP...' : 'Ask about the ESOP...'}
            style={{ flex: 1, padding: '12px 16px', border: '1px solid #ddd', borderRadius: 24, fontSize: 15, outline: 'none' }}
          />
          <button onClick={() => send()}
            style={{ width: 44, height: 44, borderRadius: '50%', background: loading ? C.gray : C.orange, border: 'none', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 8 }}>
          {lang === 'es' ? 'Solo estimaciones — para detalles de tu cuenta, contacta al equipo de Administración de Beneficios.' : 'Estimates only — for account specifics, contact the Benefits Administration team.'} · KE&amp;G Construction
        </div>
      </div>
    </div>
  )
}
