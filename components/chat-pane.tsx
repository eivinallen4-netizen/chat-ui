'use client'

import { ChatHandler, ChatMessages, ChatSection } from '@llamaindex/chat-ui'
import { OllamaModel } from '@/hooks/use-ollama-models'
import { ChatComposer } from '@/components/chat-composer'

import '@llamaindex/chat-ui/styles/markdown.css'
import '@llamaindex/chat-ui/styles/pdf.css'
import '@llamaindex/chat-ui/styles/editor.css'

type ChatPaneHandler = ChatHandler & {
  error?: string | null
  clearError?: () => void
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background chat-pane-root">
      <ChatSection handler={handler} className="gap-0 !px-3 !pb-2 !pt-4 md:!px-6 md:!pt-5">
        <ChatMessages />
      </ChatSection>
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
