import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { getTranscriptBySessionIdOnly } from '@/lib/transcript-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      return NextResponse.json(
        { error: 'Convex URL not configured' },
        { status: 500 }
      )
    }

    const client = new ConvexHttpClient(convexUrl)
    const session = await client.query(api.chatSessions.getByShareToken, { shareToken })

    if (!session) {
      return NextResponse.json(
        { error: 'Shared chat not found or link is expired' },
        { status: 404 }
      )
    }

    const transcript = await getTranscriptBySessionIdOnly(session.transcriptSessionId)

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      title: session.title,
      createdAt: session.createdAt,
      messages: transcript.messages,
    })
  } catch (error) {
    console.error('Error fetching shared chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
