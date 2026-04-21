import { useMemo, useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'



const SURVEY_URL =
  import.meta.env.VITE_SURVEY_URL || 'https://webropol.lut.fi/'

function getParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    pid: p.get('PROLIFIC_PID') || '',
    studyId: p.get('STUDY_ID') || '',
    sessionId: p.get('SESSION_ID') || '',
    condition: p.get('condition') || 'A',
  }
}

export default function App() {
  const { pid, studyId, sessionId, condition } = getParams()
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [code, setCode] = useState(
    `def auth_system(actions: list[dict]) -> list[dict]:
    users = {}
    current_user = None
    results = []
    return results`,
  )
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const conditionText = useMemo(
    () =>
      condition === 'A'
        ? 'Condition A: In your first prompt, explain your understanding of the task before asking the AI for code help.'
        : 'Condition B: In your first prompt, ask directly for code help without explaining your understanding first.',
    [condition],
  )

  useEffect(() => {
    // register / upsert participant
    fetch('/.netlify/functions/init-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, studyId, sessionId, condition }),
    }).catch(() => {})
  }, [pid, studyId, sessionId, condition])

  async function sendPrompt() {
    if (!prompt.trim()) return
    const currentPrompt = prompt
    setMessages((prev) => [...prev, { role: 'user', content: currentPrompt }])
    setPrompt('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pid,
          studyId,
          sessionId,
          condition,
          prompt: currentPrompt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to contact AI')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ])
    } catch (e) {
      setError(e.message)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error contacting the AI assistant. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function finishTask() {
    setError('')
    try {
      const res = await fetch('/.netlify/functions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pid,
          studyId,
          sessionId,
          condition,
          code_snapshot: code,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to store completion')
      setCompleted(true)
    } catch (e) {
      setError(e.message)
    }
  }

  const surveyLink = `${SURVEY_URL}?PROLIFIC_PID=${encodeURIComponent(
    pid,
  )}&condition=${encodeURIComponent(
    condition,
  )}&STUDY_ID=${encodeURIComponent(
    studyId,
  )}&SESSION_ID=${encodeURIComponent(sessionId)}`

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Human AI Study</h1>
          <p className="muted">
            Complete the task, use the integrated AI assistant, then continue to
            the survey
          </p>
        </div>
        <div className="meta">
          <span>PID: {pid || 'missing'}</span>
          <span>Condition: {condition}</span>
        </div>
      </header>

      <main className="layout">
        <section className="panel main-panel">
          <div className="card notice">
            <h2>Condition-specific instruction</h2>
            <p>{conditionText}</p>
          </div>

          <div className="card">
            <h2>Programming task</h2>
            <p>
              Implement a Python function{' '}
              <code>auth_system(actions: list[dict]) -&gt; list[dict]</code> that
              processes register, login, and profile actions using in-memory
              storage only.
            </p>
            <ul>
              <li>Validate usernames, passwords, and email format.</li>
              <li>
                Allow login when credentials are correct and track logged-in
                user.
              </li>
              <li>Return current profile or None if no user is logged in.</li>
              <li>Use standard Python only, no external libraries.</li>
            </ul>
          </div>

          <div className="card">
            <h2>Your code</h2>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="code-area"
            />
            <div className="actions">
              <button onClick={finishTask} className="primary">
                Finish task
              </button>
              {completed && (
                <a className="secondary" href={surveyLink}>
                  Continue to Webropol survey
                </a>
              )}
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </section>

        <aside className="panel side-panel">
          <div className="card grow">
            <h2>Integrated AI assistant</h2>
            <div className="chat-box">
              {messages.length === 0 && (
                <p className="muted">
                  Ask the assistant for help with the task.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`bubble-row ${m.role}`}
                >
                  <div className={`bubble ${m.role}`}>{m.content}</div>
                </div>
              ))}
            </div>
            <div className="prompt-box">
              <textarea
                rows="5"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your prompt here..."
              />
              <button
                onClick={sendPrompt}
                className="primary"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

