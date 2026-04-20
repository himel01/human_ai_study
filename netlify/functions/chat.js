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

    const { pid, studyId, sessionId, condition, prompt } = JSON.parse(
      event.body || '{}',
    )

    if (!pid || !prompt) {
      return json(400, { error: 'Missing pid or prompt' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return json(500, { error: 'OPENAI_API_KEY not configured' })
    }

    const openaiRes = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful Python coding assistant helping a participant solve a small programming task. Give concise, practical help.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
        }),
      },
    )

    const openaiData = await openaiRes.json()

    if (!openaiRes.ok) {
      const message =
        openaiData?.error?.message || 'OpenAI API returned an error'
      return json(502, { error: message })
    }

    const reply =
      openaiData.choices?.[0]?.message?.content || 'No response returned.'

    const supabase = getSupabase()
    const { error } = await supabase.from('ai_logs').insert({
      prolific_pid: pid,
      study_id: studyId,
      session_id: sessionId,
      condition,
      prompt,
      response: reply,
      created_at: new Date().toISOString(),
    })

    if (error) return json(500, { error: error.message })

    return json(200, { reply })
  } catch (e) {
    return json(500, { error: e.message || 'Unknown error' })
  }
}
