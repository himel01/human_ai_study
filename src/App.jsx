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

  const [phase, setPhase] = useState(
    condition === 'A' ? 'prep' : 'chat',
  )
  const [explanation, setExplanation] = useState('')
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
  const [firstPromptSent, setFirstPromptSent] = useState(false)

  const conditionText = useMemo(() => {
    if (condition === 'A') {
      return 'Condition A: You first write down your own understanding of the task. That exact text is used as your first prompt to the AI.'
    }
    return 'Condition B: For your first prompt, use the task description directly to ask the AI for code help, without first writing out your own detailed understanding.'
  }, [condition])

  useEffect(() => {
    fetch('/.netlify/functions/init-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, studyId, sessionId, condition }),
    }).catch(() => {})
  }, [pid, studyId, sessionId, condition])

  function goToChatFromPrep() {
    setPrompt(explanation.trim())
    setPhase('chat')
  }

  async function sendPrompt() {
    if (!prompt.trim()) return

    setLoading(true)
    setError('')
    const currentPrompt = prompt.trim()

    setMessages((prev) => [...prev, { role: 'user', content: currentPrompt }])
    setPrompt('')
    if (!firstPromptSent) setFirstPromptSent(true)

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

  const canContinueFromPrep =
    condition !== 'A' || explanation.trim().length >= 30

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Human-AI Study</h1>
          <p className="muted">
            Complete the task, use the integrated AI assistant, then continue to
            the survey.
          </p>
        </div>
        <div className="meta">
          <span>PID: {pid || 'missing'}</span>
          <span>Condition: {condition}</span>
        </div>
      </header>

      {condition === 'A' && phase === 'prep' ? (
        <main className="layout">
          <section className="panel main-panel">
            <div className="card notice">
              <h2>Step 1: Explain your understanding of the task</h2>
              <p>
                In this version of the study, we are interested in how you
                explain programming tasks to an AI assistant.
              </p>
              <p>Before you ask the AI for code, please:</p>
              <ul>
                <li>Read the task description carefully.</li>
                <li>
                  Form your own understanding of what the function should do and
                  how you might implement it.
                </li>
                <li>
                  Write down this understanding in your own words in the text
                  box below (1–2 short paragraphs).
                </li>
              </ul>
              <p>Your explanation should cover:</p>
              <ul>
                <li>What the function is supposed to do (inputs and outputs).</li>
                <li>
                  The main steps or logic you think your implementation will
                  need.
                </li>
                <li>Any edge cases or validation rules you think are important.</li>
              </ul>
              <p className="muted">
                On the next screen, this exact text will appear in the AI prompt
                box. You can then send it as your first message to the AI (or
                edit it if needed).
              </p>
            </div>

            <div className="card">
              <h2>Programming task</h2>
              <div
                className="task-scroll"
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  background: '#fafafa',
                  fontSize: '0.9rem',
                }}
              >
                <h3>Programming Task: Simple User Authentication System</h3>
                <h4>Task Description</h4>
                <p>
                  Implement a Python function <code>auth_system</code> that
                  processes a sequence of user actions and simulates a simple
                  authentication system using in-memory storage only.
                </p>

                <h4>Function Signature</h4>
                <pre>
{`def auth_system(actions: list[dict]) -> list[dict]:`}
                </pre>

                <h4>Action Types</h4>
                <p>1. Register Action</p>
                <pre>
{`{
  "action": "register",
  "username": "alice",
  "password": "secret123",
  "email": "alice@example.com"
}`}
                </pre>

                <p>2. Login Action</p>
                <pre>
{`{
  "action": "login",
  "username": "alice",
  "password": "secret123"
}`}
                </pre>

                <p>3. Profile Action</p>
                <pre>
{`{
  "action": "profile"
}`}
                </pre>

                <h4>Rules</h4>
                <h5>Registration Rules</h5>
                <p>
                  Registration should be reasonably secure by checking for:
                </p>
                <ul>
                  <li>Appropriate usernames</li>
                  <li>Strong enough passwords</li>
                  <li>Valid-looking emails</li>
                </ul>
                <p>
                  Failed registrations should return an error with a reason you
                  define.
                </p>

                <h5>Login Rules</h5>
                <ul>
                  <li>
                    Login succeeds when credentials are correct according to
                    your validation.
                  </li>
                  <li>Login fails when credentials are incorrect.</li>
                </ul>
                <p>
                  Note: Successful login sets that user as the current logged-in
                  user.
                </p>

                <h5>Profile Rules</h5>
                <p>
                  Return current logged-in user's profile or <code>None</code> if
                  no one is logged in.
                </p>

                <h4>Response Format</h4>
                <p>Successful Register/Login:</p>
                <pre>
{`{"status": "success"}`}
                </pre>

                <p>Failed Register/Login:</p>
                <pre>
{`{"status": "error", "reason": "username_taken"}`}
                </pre>

                <p>Profile:</p>
                <pre>
{`{"status": "success", "profile": {"username": "alice", "email": "alice@example.com"}}`}
                </pre>
                <p>or</p>
                <pre>
{`{"status": "success", "profile": None}`}
                </pre>

                <h4>Example Input</h4>
                <pre>
{`actions = [
  {"action": "register", "username": "alice", "password": "secret123", "email": "alice@example.com"},
  {"action": "register", "username": "alice", "password": "newpass456", "email": "alice2@example.com"},
  {"action": "login", "username": "alice", "password": "secret123"},
  {"action": "profile"},
  {"action": "login", "username": "alice", "password": "wrongpass"},
  {"action": "profile"}
]`}
                </pre>

                <h4>Constraints</h4>
                <p>
                  Standard Python only, in-memory storage, no external
                  libraries.
                </p>
              </div>
            </div>

            <div className="card">
              <h2>Your understanding of the task</h2>
              <textarea
                className="code-area"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Describe what the function should do, how you would approach the implementation, and any important edge cases..."
              />
              <div className="actions">
                <button
                  className="primary"
                  onClick={goToChatFromPrep}
                  disabled={!canContinueFromPrep}
                >
                  Continue to AI assistant
                </button>
                {!canContinueFromPrep && (
                  <p className="muted">
                    Please write at least a few sentences before continuing.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="layout">
          <section className="panel main-panel">
            <div className="card notice">
              <h2>Condition-specific instruction</h2>
              <p>{conditionText}</p>
            </div>

            <div className="card">
              <h2>Programming task</h2>
              <div
                className="task-scroll"
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  background: '#fafafa',
                  fontSize: '0.9rem',
                }}
              >
                <h3>Programming Task: Simple User Authentication System</h3>
                <h4>Task Description</h4>
                <p>
                  Implement a Python function <code>auth_system</code> that
                  processes a sequence of user actions and simulates a simple
                  authentication system using in-memory storage only.
                </p>

                <h4>Function Signature</h4>
                <pre>
{`def auth_system(actions: list[dict]) -> list[dict]:`}
                </pre>

                <h4>Action Types</h4>
                <p>1. Register Action</p>
                <pre>
{`{
  "action": "register",
  "username": "alice",
  "password": "secret123",
  "email": "alice@example.com"
}`}
                </pre>

                <p>2. Login Action</p>
                <pre>
{`{
  "action": "login",
  "username": "alice",
  "password": "secret123"
}`}
                </pre>

                <p>3. Profile Action</p>
                <pre>
{`{
  "action": "profile"
}`}
                </pre>

                <h4>Rules</h4>
                <h5>Registration Rules</h5>
                <p>
                  Registration should be reasonably secure by checking for:
                </p>
                <ul>
                  <li>Appropriate usernames</li>
                  <li>Strong enough passwords</li>
                  <li>Valid-looking emails</li>
                </ul>
                <p>
                  Failed registrations should return an error with a reason you
                  define.
                </p>

                <h5>Login Rules</h5>
                <ul>
                  <li>
                    Login succeeds when credentials are correct according to
                    your validation.
                  </li>
                  <li>Login fails when credentials are incorrect.</li>
                </ul>
                <p>
                  Note: Successful login sets that user as the current logged-in
                  user.
                </p>

                <h5>Profile Rules</h5>
                <p>
                  Return current logged-in user's profile or <code>None</code> if
                  no one is logged in.
                </p>

                <h4>Response Format</h4>
                <p>Successful Register/Login:</p>
                <pre>
{`{"status": "success"}`}
                </pre>

                <p>Failed Register/Login:</p>
                <pre>
{`{"status": "error", "reason": "username_taken"}`}
                </pre>

                <p>Profile:</p>
                <pre>
{`{"status": "success", "profile": {"username": "alice", "email": "alice@example.com"}}`}
                </pre>
                <p>or</p>
                <pre>
{`{"status": "success", "profile": None}`}
                </pre>

                <h4>Example Input</h4>
                <pre>
{`actions = [
  {"action": "register", "username": "alice", "password": "secret123", "email": "alice@example.com"},
  {"action": "register", "username": "alice", "password": "newpass456", "email": "alice2@example.com"},
  {"action": "login", "username": "alice", "password": "secret123"},
  {"action": "profile"},
  {"action": "login", "username": "alice", "password": "wrongpass"},
  {"action": "profile"}
]`}
                </pre>

                <h4>Constraints</h4>
                <p>
                  Standard Python only, in-memory storage, no external
                  libraries.
                </p>
              </div>
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

              {condition === 'A' && !firstPromptSent && (
                <p className="muted" style={{ marginBottom: '8px' }}>
                  The text in the box below is exactly what you wrote on the
                  previous screen. You can send it as your first message to the
                  AI, or edit it before sending.
                </p>
              )}

              {condition === 'B' && !firstPromptSent && (
                <p className="muted" style={{ marginBottom: '8px' }}>
                  For your first prompt, please use the task description
                  directly to ask the AI for code help, without adding a long
                  explanation of your own understanding first. You may refine
                  prompts later.
                </p>
              )}

              <div className="chat-box">
                {messages.length === 0 && (
                  <p className="muted">
                    Ask the assistant for help with the task.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`bubble-row ${m.role}`}>
                    <div className={`bubble ${m.role}`}>{m.content}</div>
                  </div>
                ))}
              </div>

              <div className="prompt-box">
                <textarea
                  rows="5"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    condition === 'A' && !firstPromptSent
                      ? 'Your explanation is pre-filled. You can edit it or press Send.'
                      : 'Type your next prompt here...'
                  }
                />
                <button
                  onClick={sendPrompt}
                  className="primary"
                  disabled={loading || !prompt.trim()}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </aside>
        </main>
      )}
    </div>
  )
}

