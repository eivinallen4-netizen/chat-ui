import { NextRequest } from 'next/server'
import type { Message } from '@llamaindex/chat-ui'
import { BASIC_PLAN_MAX_MESSAGE_CHARS } from '@/lib/app-plan'
import { getLongestUserMessageLength } from '@/lib/chat-message-utils'
import { deleteTranscript, getTranscript, upsertTranscript } from '@/lib/transcript-store'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params
  const userId = request.nextUrl.searchParams.get('userId') ?? ''
  const transcript = await getTranscript(sessionId, userId)
  return Response.json({ messages: transcript?.messages ?? [] })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params
  const body = (await request.json()) as { messages?: Message[], userId?: string }
  const messages = Array.isArray(body.messages) ? body.messages : []
  const userId = body.userId ?? ''
  const longestUserMessage = getLongestUserMessageLength(messages)

  if (longestUserMessage > BASIC_PLAN_MAX_MESSAGE_CHARS) {
    return Response.json(
      { error: `Basic plan messages are limited to ${BASIC_PLAN_MAX_MESSAGE_CHARS} characters.` },
      { status: 400 }
    )
  }

  await upsertTranscript(sessionId, userId, messages)
  return Response.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params
  const body = (await request.json().catch(() => ({}))) as { userId?: string }
  const userId = body.userId ?? ''
  await deleteTranscript(sessionId, userId)
  return Response.json({ ok: true })
}
