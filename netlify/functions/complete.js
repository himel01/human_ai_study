import { getSupabase } from './_supabase.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' })
    }

    const { pid, studyId, sessionId, condition, code_snapshot } = JSON.parse(
      event.body || '{}',
    )

    if (!pid) {
      return json(400, { error: 'Missing pid' })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('completions').insert({
      prolific_pid: pid,
      study_id: studyId,
      session_id: sessionId,
      condition,
      code_snapshot,
      created_at: new Date().toISOString(),
    })

    if (error) return json(500, { error: error.message })

    return json(200, { ok: true })
  } catch (e) {
    return json(500, { error: e.message || 'Unknown error' })
  }
}
