import type { Message } from '@llamaindex/chat-ui'
import type { DataMode, PlanTier } from '@/lib/app-plan'

export interface ServiceConnectionSettings {
  apiEndpoint: string
  authType: 'bearer' | 'key' | 'none'
  authToken: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface ChatSession extends ChatSessionSummary {
  messages: Message[]
}

export interface AppUser {
  id: string
  clerkId: string
  planTier: PlanTier
  persistedChatCount: number
  totalChatsCreated: number
  serviceConnections: Record<string, ServiceConnectionSettings> | null
}

export interface ChatCreateSuccess {
  ok: true
  session: ChatSessionSummary
  shouldTriggerAdsEvent: boolean
  newChatCount: number
}

export interface ChatCreateFailure {
  ok: false
  error: string
}

export type ChatCreateResult = ChatCreateSuccess | ChatCreateFailure

export interface MessageValidationResult {
  allowed: boolean
  error: string | null
  maxChars: number
}

export interface BasicPlanChatThresholdEvent {
  planTier: PlanTier
  dataMode: DataMode
  chatCount: number
}
