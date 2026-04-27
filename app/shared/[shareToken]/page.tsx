import type { Message } from '@llamaindex/chat-ui'
import { notFound } from 'next/navigation'
import { isTextPart } from '@/lib/chat-response-parts'

interface SharedChatData {
  title: string
  createdAt: string
  messages: Message[]
}

async function getSharedChat(shareToken: string): Promise<SharedChatData | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/shared/${shareToken}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching shared chat:', error)
    return null
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SharedChatPage({
  params,
}: {
  params: { shareToken: string }
}) {
  const chat = await getSharedChat(params.shareToken)

  if (!chat) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <h1 className="font-display text-2xl font-bold text-foreground">{chat.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared on {formatDate(chat.createdAt)}
          </p>
        </div>
      </header>

      {/* Messages */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="space-y-4">
          {chat.messages.length === 0 ? (
            <p className="text-center text-muted-foreground">No messages yet</p>
          ) : (
            chat.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-3 text-sm sm:max-w-md md:max-w-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.parts.map((part, partIndex) => {
                    if (isTextPart(part)) {
                      return <p key={partIndex}>{part.text}</p>
                    }
                    return null
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-2xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          Shared via <span className="font-semibold">chatui</span>
        </div>
      </footer>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: { shareToken: string }
}) {
  const chat = await getSharedChat(params.shareToken)

  if (!chat) {
    return {
      title: 'Chat not found',
    }
  }

  return {
    title: chat.title,
    description: 'A shared chat transcript',
  }
}
