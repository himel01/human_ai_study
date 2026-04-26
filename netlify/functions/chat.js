import OpenAI from 'openai'
import { getSupabase } from './_supabase.js'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    if (!pid) return json(400, { error: 'Missing PROLIFIC_PID' })
    if (!prompt || !prompt.trim()) {
      return json(400, { error: 'Missing prompt' })
    }

    const supabase = getSupabase()

    const { data: existingState, error: stateFetchError } = await supabase
      .from('chat_state')
      .select('id, last_response_id')
      .eq('prolific_pid', pid)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (stateFetchError) {
      return json(500, { error: stateFetchError.message })
    }

    const requestBody = {
      model: 'gpt-4o-mini',
      input: prompt,
      store: true,
    }

    if (existingState?.last_response_id) {
      requestBody.previous_response_id = existingState.last_response_id
    }

    const response = await client.responses.create(requestBody)

    const reply = response.output_text || ''
    const newResponseId = response.id

    if (existingState?.id) {
      const { error: updateError } = await supabase
        .from('chat_state')
        .update({
          last_response_id: newResponseId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingState.id)

      if (updateError) {
        return json(500, { error: updateError.message })
      }
    } else {
      const { error: insertStateError } = await supabase
        .from('chat_state')
        .insert({
          prolific_pid: pid,
          study_id: studyId,
          session_id: sessionId,
          condition,
          last_response_id: newResponseId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertStateError) {
        return json(500, { error: insertStateError.message })
      }
    }

    const { error: logError } = await supabase
      .from('ai_logs')
      .insert({
        prolific_pid: pid,
        study_id: studyId,
        session_id: sessionId,
        condition,
        prompt: prompt,
        response: reply,
        response_id: newResponseId,
        created_at: new Date().toISOString(),
      })

    if (logError) {
      return json(500, { error: logError.message })
    }

    return json(200, { reply })
  } catch (e) {
    return json(500, { error: e.message || 'Unknown error' })
  }
}