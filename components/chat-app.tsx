'use client'

import { useState } from 'react'
import { useSettings } from '@/hooks/use-settings'
import { useAuth } from '@clerk/nextjs'
import { BASIC_PLAN_MAX_MESSAGE_CHARS } from '@/lib/app-plan'
import { trackBasicPlanChatThreshold } from '@/lib/analytics'
import { getMessageText } from '@/lib/chat-message-utils'
import { useLocalChatHistory } from '@/hooks/use-local-chat-history'
import { useAuthenticatedChatHistory } from '@/hooks/use-authenticated-chat-history'
import { useRealChat } from '@/hooks/use-real-chat'
import { useOllamaModels } from '@/hooks/use-ollama-models'
import { Sidebar } from './sidebar'
import { ChatHeader } from './chat-header'
import { ChatPane } from './chat-pane'
import { SettingsPanel } from './settings-panel'
import { LoadingDots } from './loading-dots'
import { OnboardingPanel } from './onboarding-panel'

export default function ChatApp() {
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [onboardingManuallyOpen, setOnboardingManuallyOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const {
    services,
    activeService,
    activeServiceId,
    apiEndpoint,
    authType,
    authToken,
    selectedModel,
    systemPrompt,
    serviceDefinition,
    setActiveServiceId,
    importServiceMarkdown,
    setSelectedModel,
    setApiEndpoint,
    setAuthType,
    setAuthToken,
    setSystemPrompt,
    hydrated: settingsHydrated,
  } = useSettings()

  const {
    models,
    loading: modelsLoading,
    error: modelsError,
    isConnected,
    isMutating: modelsMutating,
    mutationError,
    refresh: refreshModels,
    pullModel,
    deleteModel,
  } = useOllamaModels(
    apiEndpoint,
    serviceDefinition,
    authType,
    authToken
  )
  const { isSignedIn } = useAuth()
  const isAuthenticated = Boolean(isSignedIn && hasConvex)

  const localHistory = useLocalChatHistory()
  const authenticatedHistory = useAuthenticatedChatHistory(isAuthenticated)
  const history = isAuthenticated ? authenticatedHistory : localHistory

  const { sessions, activeId, activeSession, currentUser } = history
  const initialMessages = activeSession?.messages ?? []
  const dataMode = isAuthenticated ? 'authenticated' : 'guest'
  const messageLimit =
    dataMode === 'authenticated' && currentUser?.planTier === 'basic'
      ? BASIC_PLAN_MAX_MESSAGE_CHARS
      : null
  const onboardingOpen =
    onboardingManuallyOpen || (history.hydrated && sessions.length === 0 && !onboardingDismissed)

  const handler = useRealChat({
    apiEndpoint,
    serviceDefinition,
    authType,
    authToken,
    selectedModel,
    systemPrompt,
    initialMessages,
    onMessagesChange: msgs => {
      if (activeId) {
        void history.updateSession(activeId, msgs)
      }
    },
    validateBeforeSend: async message => {
      if (!isAuthenticated) {
        return null
      }

      const result = await history.validateMessageLength(getMessageText(message))
      if (!result.allowed) {
        setValidationError(result.error)
        return result.error
      }

      setValidationError(null)
      return null
    },
  })

  const handleNewChat = async () => {
    setValidationError(null)
    const result = await history.createSession()

    if (
      isAuthenticated &&
      result.ok &&
      result.shouldTriggerAdsEvent
    ) {
      trackBasicPlanChatThreshold({
        planTier: currentUser?.planTier ?? 'basic',
        dataMode,
        chatCount: result.newChatCount,
      })
    }
  }

  const handleLoad = (id: string) => {
    setValidationError(null)
    void history.loadSession(id)
  }

  const handleDelete = (id: string) => {
    setValidationError(null)
    void history.deleteSession(id)
  }

  const handleAddModel = async (modelName: string) => {
    pullModel(modelName)
    setSelectedModel(modelName)
  }

  const handleDeleteModels = async (modelNames: string[]) => {
    for (const modelName of modelNames) {
      await deleteModel(modelName)
    }

    if (modelNames.includes(selectedModel)) {
      setSelectedModel('')
    }
  }

  // Show loading state until both hooks are hydrated
  if (!settingsHydrated || !history.hydrated) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-8 shadow-md">
          <LoadingDots />
          <p className="text-muted-foreground text-sm font-medium">Loading chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onNew={() => void handleNewChat()}
        onLoad={handleLoad}
        onDelete={handleDelete}
        dataMode={dataMode}
        currentUser={currentUser}
        error={history.error}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onFeaturesClick={() => setOnboardingManuallyOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <ChatHeader
          title={activeSession?.title ?? 'New Chat'}
          serviceName={activeService?.name ?? 'Service'}
          isConnected={isConnected}
          onSettingsOpen={() => setSettingsOpen(true)}
          onMenuOpen={() => setSidebarOpen(true)}
          currentUser={currentUser}
        />

        {activeId ? (
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <ChatPane
              key={activeId}
              handler={handler}
              models={models}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              loading={modelsLoading}
              isConnected={isConnected}
              isMutating={modelsMutating}
              error={mutationError ?? modelsError}
              onRefresh={refreshModels}
              onAddModel={handleAddModel}
              onDeleteModels={handleDeleteModels}
              messageLimit={messageLimit}
              validationError={validationError ?? history.error}
              onValidationErrorChange={setValidationError}
            />
          </div>
        ) : (
          <EmptyState onNew={() => void handleNewChat()} dataMode={dataMode} />
        )}
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        services={services}
        activeServiceId={activeServiceId}
        apiEndpoint={apiEndpoint}
        authType={authType}
        authToken={authToken}
        systemPrompt={systemPrompt}
        onSelectService={setActiveServiceId}
        onImportMarkdown={importServiceMarkdown}
        onApiEndpointChange={setApiEndpoint}
        onAuthTypeChange={setAuthType}
        onAuthTokenChange={setAuthToken}
        onSystemPromptChange={setSystemPrompt}
      />
      <OnboardingPanel
        open={onboardingOpen}
        onClose={() => {
          setOnboardingDismissed(true)
          setOnboardingManuallyOpen(false)
        }}
      />
    </div>
  )
}

function EmptyState({ onNew, dataMode }: { onNew: () => void; dataMode: 'guest' | 'authenticated' }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-background px-4">
      <div className="rounded-3xl bg-card p-8 shadow-sm text-center max-w-sm w-full">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Start a conversation</h2>
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          {dataMode === 'authenticated'
            ? 'Select a synced chat or begin a new one.'
            : 'Select a local chat or begin a new one.'}
        </p>
        <button
          onClick={onNew}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:opacity-90 active:scale-95 transition-all min-h-[48px]"
        >
          New Chat
        </button>
      </div>
    </div>
  )
}
