import { makeFunctionReference } from 'convex/server'
import type {
  AppUser,
  ChatCreateResult,
  ChatSessionSummary,
  MessageValidationResult,
} from '@/lib/chat-types'

const query = <Args extends Record<string, unknown>, Result>(name: string) =>
  makeFunctionReference<'query', Args, Result>(name)

const mutation = <Args extends Record<string, unknown>, Result>(name: string) =>
  makeFunctionReference<'mutation', Args, Result>(name)

export const convexApi = {
  users: {
    getCurrentUser: query<Record<string, never>, AppUser | null>('users:getCurrentUser'),
    bootstrapCurrentUser: mutation<Record<string, never>, AppUser>('users:bootstrapCurrentUser'),
    validateMessageForCurrentUser: mutation<{ textLength: number }, MessageValidationResult>(
      'users:validateMessageForCurrentUser'
    ),
  },
  chatSessions: {
    listByCurrentUser: query<Record<string, never>, ChatSessionSummary[]>(
      'chatSessions:listByCurrentUser'
    ),
    createForCurrentUser: mutation<Record<string, never>, ChatCreateResult>(
      'chatSessions:createForCurrentUser'
    ),
    updateMetadataForCurrentUser: mutation<
      {
        sessionId: string
        title: string
        messageCount: number
      },
      null
    >('chatSessions:updateMetadataForCurrentUser'),
    deleteForCurrentUser: mutation<{ sessionId: string }, null>('chatSessions:deleteForCurrentUser'),
  },
}
