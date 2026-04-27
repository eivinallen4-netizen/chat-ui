'use client'

import { useState } from 'react'
import type { ChatHandler, Message } from '@llamaindex/chat-ui'
import { Send, Share2, BookOpen, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BASIC_PLAN_MAX_MESSAGE_CHARS } from '@/lib/app-plan'
import { ModelSelector } from '@/components/model-selector'
import type { OllamaModel } from '@/hooks/use-ollama-models'

interface ChatComposerProps {
  handler: ChatHandler
  models: OllamaModel[]
  selectedModel: string
  onModelChange: (model: string) => void
  loading: boolean
  isConnected: boolean
  isDeleting: boolean
  error: string | null
  onRefresh: () => void
  onDeleteModels: (modelNames: string[]) => Promise<void>
  pullingModelName?: string | null
  messageLimit: number | null
  validationError: string | null
  onValidationErrorChange: (error: string | null) => void
  onShare?: () => void
  onModelLibraryOpen?: () => void
  onModelLibraryRefresh?: () => void
}

export function ChatComposer({
  handler,
  models,
  selectedModel,
  onModelChange,
  loading,
  isConnected,
  isDeleting,
  error,
  onRefresh,
  onDeleteModels,
  pullingModelName = null,
  messageLimit,
  validationError,
  onValidationErrorChange,
  onShare,
  onModelLibraryOpen,
  onModelLibraryRefresh,
}: ChatComposerProps) {
  const [input, setInput] = useState('')
  const isSending = handler.status === 'submitted' || handler.status === 'streaming'
  const currentLength = input.length
  const effectiveLimit = messageLimit ?? BASIC_PLAN_MAX_MESSAGE_CHARS
  const isOverLimit = messageLimit !== null && currentLength > effectiveLimit
  const submitDisabled = !input.trim() || isSending || isOverLimit || !selectedModel

  const submitMessage = async () => {
    if (submitDisabled) {
      if (isOverLimit) {
        onValidationErrorChange(`Basic plan messages are limited to ${effectiveLimit} characters.`)
      }
      return
    }

    onValidationErrorChange(null)

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', text: input }],
    }

    await handler.sendMessage(message)
    setInput('')
  }

  return (
    <div className="px-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-2 md:px-6 md:pb-6 md:pt-4">
      <div className="rounded-3xl border border-border bg-card shadow-md shadow-muted/40">
        <div className="px-4 pt-4">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submitMessage()
              }
            }}
            placeholder="Type a message..."
            className="min-h-[80px] md:min-h-[120px] w-full resize-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground font-sans"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              loading={loading}
              isConnected={isConnected}
              isDeleting={isDeleting}
              error={error}
              onRefresh={onRefresh}
              onDeleteModels={onDeleteModels}
              pullingModelName={pullingModelName}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={onModelLibraryOpen}
              className="rounded-xl size-10 shrink-0"
              title="Add Model"
              aria-label="Add Model"
            >
              <BookOpen className="size-4" />
            </Button>
            {process.env.NODE_ENV === 'development' ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={onModelLibraryRefresh}
                className="rounded-xl size-10 shrink-0"
                title="Refresh model library cache"
                aria-label="Refresh model library cache"
              >
                <RefreshCw className="size-4" />
              </Button>
            ) : null}
            {onShare && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={onShare}
                className="rounded-full size-10 shrink-0"
                title="Share this chat"
              >
                <Share2 className="size-4" />
              </Button>
            )}
            {messageLimit !== null && (
              <span
                className={cn(
                  'text-xs tabular-nums px-2 py-0.5 rounded-full bg-muted',
                  isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {currentLength}/{effectiveLimit}
              </span>
            )}
          </div>

          <Button
            type="button"
            size="icon"
            onClick={() => void submitMessage()}
            disabled={submitDisabled}
            className="rounded-full size-10 shrink-0 hover:scale-105 active:scale-90 transition-transform disabled:scale-100"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      {(validationError || isOverLimit || !selectedModel) && (
        <p className="mt-2 text-sm text-destructive">
          {!selectedModel
            ? 'Select a model before sending.'
            : validationError ?? `Basic plan messages are limited to ${effectiveLimit} characters.`}
        </p>
      )}
    </div>
  )
}
