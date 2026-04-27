'use client'

import { useEffect, useRef } from 'react'
import { ChatHandler, Message } from '@llamaindex/chat-ui'
import { Bot, Download } from 'lucide-react'
import { OllamaModel } from '@/hooks/use-ollama-models'
import { ChatComposer } from '@/components/chat-composer'
import { cn } from '@/lib/utils'

import '@llamaindex/chat-ui/styles/markdown.css'
import '@llamaindex/chat-ui/styles/pdf.css'
import '@llamaindex/chat-ui/styles/editor.css'

type ChatPaneHandler = ChatHandler & {
  error?: string | null
  clearError?: () => void
}

function isTextPart(part: Message['parts'][number]): part is Message['parts'][number] & { text: string } {
  return part.type === 'text' && 'text' in part && typeof part.text === 'string'
}

function isFilePart(
  part: Message['parts'][number]
): part is Message['parts'][number] & { data: { url: string; filename: string } } {
  return (
    part.type === 'data-file' &&
    'data' in part &&
    typeof part.data === 'object' &&
    part.data !== null &&
    'url' in part.data &&
    'filename' in part.data
  )
}

interface ChatPaneProps {
  handler: ChatPaneHandler
  models: OllamaModel[]
  selectedModel: string
  onModelChange: (model: string) => void
  loading: boolean
  isConnected: boolean
  isMutating: boolean
  error: string | null
  onRefresh: () => void
  onAddModel: (modelName: string) => Promise<void>
  onDeleteModels: (modelNames: string[]) => Promise<void>
  messageLimit: number | null
  validationError: string | null
  onValidationErrorChange: (error: string | null) => void
}

export function ChatPane({
  handler,
  models,
  selectedModel,
  onModelChange,
  loading,
  isConnected,
  isMutating,
  error,
  onRefresh,
  onAddModel,
  onDeleteModels,
  messageLimit,
  validationError,
  onValidationErrorChange,
}: ChatPaneProps) {
  return (
    <div className="flex flex-col h-screen flex-1 overflow-hidden bg-background chat-pane-root">
      <MessageList handler={handler} />
      <ChatComposer
        handler={handler}
        models={models}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        loading={loading}
        isConnected={isConnected}
        isMutating={isMutating}
        error={error ?? handler.error ?? null}
        onRefresh={onRefresh}
        onAddModel={onAddModel}
        onDeleteModels={onDeleteModels}
        messageLimit={messageLimit}
        validationError={validationError ?? handler.error ?? null}
        onValidationErrorChange={nextError => {
          onValidationErrorChange(nextError)
          if (!nextError) {
            handler.clearError?.()
          }
        }}
      />
    </div>
  )
}

function MessageList({ handler }: { handler: ChatHandler }) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [handler.messages, handler.status])

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto  bg-background mx-3 mb-2 mt-3 p-3 md:p-6">
      {handler.messages.map(message => (
        <div
          key={message.id}
          className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          {message.role === 'assistant' && (
            <div className="bg-background flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border">
              <Bot className="h-4 w-4" />
            </div>
          )}

          <div className={cn('flex min-w-0 max-w-[82%] flex-col gap-3', message.role === 'user' && 'items-end')}>
            {message.parts.map((part, index) => {
              if (isTextPart(part)) {
                return (
                  <div
                    key={`${message.id}-text-${index}`}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground'
                    )}
                  >
                    {part.text}
                  </div>
                )
              }

              if (isFilePart(part)) {
                return (
                  <a
                    key={`${message.id}-file-${index}`}
                    href={part.data.url}
                    download={part.data.filename}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-accent',
                      message.role === 'user' && 'self-end'
                    )}
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span className="truncate">{part.data.filename}</span>
                  </a>
                )
              }

              return null
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
