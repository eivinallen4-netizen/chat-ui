import type { Message } from '@llamaindex/chat-ui'
import { normalizeMessages } from '@/lib/chat-message-normalize'
import { getTursoClient } from '@/lib/turso'

interface TranscriptRow {
  sessionId: string
  clerkUserId: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export async function getTranscript(sessionId: string, clerkUserId: string): Promise<TranscriptRow | null> {
  const client = await getTursoClient()
  const result = await client.execute({
    sql: `
      SELECT session_id, clerk_user_id, messages_json, created_at, updated_at
      FROM chat_transcripts
      WHERE session_id = ? AND clerk_user_id = ?
      LIMIT 1
    `,
    args: [sessionId, clerkUserId],
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    sessionId: String(row.session_id),
    clerkUserId: String(row.clerk_user_id),
    messages: normalizeMessages(JSON.parse(String(row.messages_json))),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function upsertTranscript(sessionId: string, clerkUserId: string, messages: Message[]) {
  const client = await getTursoClient()
  const now = new Date().toISOString()

  await client.execute({
    sql: `
      INSERT INTO chat_transcripts (session_id, clerk_user_id, messages_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        messages_json = excluded.messages_json,
        updated_at = excluded.updated_at,
        clerk_user_id = excluded.clerk_user_id
    `,
    args: [sessionId, clerkUserId, JSON.stringify(messages), now, now],
  })
}

export async function deleteTranscript(sessionId: string, clerkUserId: string) {
  const client = await getTursoClient()
  await client.execute({
    sql: 'DELETE FROM chat_transcripts WHERE session_id = ? AND clerk_user_id = ?',
    args: [sessionId, clerkUserId],
  })
}
