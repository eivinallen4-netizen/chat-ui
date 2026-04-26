'use client'

import { useState } from 'react'
import type { ChatHandler, Message } from '@llamaindex/chat-ui'
import { Send } from 'lucide-react'
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
  isMutating: boolean
  error: string | null
  onRefresh: () => void
  onAddModel: (modelName: string) => Promise<void>
  onDeleteModels: (modelNames: string[]) => Promise<void>
  messageLimit: number | null
  validationError: string | null
  onValidationErrorChange: (error: string | null) => void
}

export function ChatComposer({
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
    <div className="px-3 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
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
              isMutating={isMutating}
              error={error}
              onRefresh={onRefresh}
              onAddModel={onAddModel}
              onDeleteModels={onDeleteModels}
            />
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
