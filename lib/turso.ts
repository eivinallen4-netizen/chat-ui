import { createClient, type Client } from '@libsql/client'

let client: Client | null = null
let schemaReadyPromise: Promise<void> | null = null

function getRequiredEnv(name: 'TURSO_DATABASE_URL' | 'TURSO_AUTH_TOKEN') {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}`)
  }

  return value
}

function getClient() {
  if (!client) {
    client = createClient({
      url: getRequiredEnv('TURSO_DATABASE_URL'),
      authToken: getRequiredEnv('TURSO_AUTH_TOKEN'),
    })
  }

  return client
}

async function ensureSchema() {
  if (!schemaReadyPromise) {
    const db = getClient()
    schemaReadyPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS chat_transcripts (
          session_id TEXT PRIMARY KEY,
          clerk_user_id TEXT NOT NULL,
          messages_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_transcripts_clerk_user_id
        ON chat_transcripts (clerk_user_id)
      `)
    })()
  }

  await schemaReadyPromise
  return getClient()
}

export async function getTursoClient() {
  return ensureSchema()
}
